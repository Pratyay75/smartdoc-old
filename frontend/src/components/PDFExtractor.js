import React, { useState, useRef, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { FiPlus, FiMinus } from "react-icons/fi";
import Chatbot from "./Chatbot";
import "./PDFExtractor.css";
import { MdFitScreen } from "react-icons/md";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;
pdfjs.GlobalWorkerOptions.cMapUrl = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/cmaps/`;
pdfjs.GlobalWorkerOptions.cMapPacked = true;
pdfjs.disableFontFace = true;
function PDFExtractor() {
  const [pdfFile, setPdfFile] = useState(null);
const [loading, setLoading] = useState(false); // ⏳ loading spinner
const [isExtracted, setIsExtracted] = useState(false); // ✅ new state

  const [numPages, setNumPages] = useState(null);
  const [pdfId, setPdfId] = useState(null);
  const [originalData, setOriginalData] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState({
  policyholderName: "",
  issueDate: "",
  expirationDate: "",
  providerName: "",
  policyholderAddress: "",
  policyNumber: "",
  premiumAmount: "",
  deductibles: "",
  termsAndExclusions: ""
});
const [ocrUsed, setOcrUsed] = useState(false);


  const [confidenceScores, setConfidenceScores] = useState({
  policyholderName: null,
  issueDate: null,
  expirationDate: null,
  providerName: null,
  policyholderAddress: null,
  policyNumber: null,
  premiumAmount: null,
  deductibles: null
});


  const [zoom, setZoom] = useState(1.2);
  const [highlights, setHighlights] = useState([]);
  const [highlightRects, setHighlightRects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const viewerRef = useRef(null);
  const pageRefs = useRef([]);
  const textLayersRef = useRef([]);
  const issueDateVariantsRef = useRef([]);
  const expirationDateVariantsRef = useRef([]);

const handleFile = (e) => {
  const file = e.target.files[0];
  setPdfFile(file); // ⛔️ No extraction here now — only setting the file
};
const handleExtract = () => {
  if (!pdfFile) {
    alert("Please upload a PDF first.");
    return;
  }

  setLoading(true); // Start spinner
  setIsExtracted(false);

  const fd = new FormData();
  fd.append("pdf", pdfFile);
  fd.append("user_id", localStorage.getItem("token"));

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const [dd, mm, yyyy] = dateStr.split("-");
    return yyyy && mm && dd ? `${yyyy}-${mm}-${dd}` : "";
  };

  fetch("/extract", {
    method: "POST", 
    body: fd,
  })
    .then((res) => res.json())
    .then((data) => {
      setPdfId(data.pdf_id);
      setOriginalData(data);
      setOcrUsed(data.ocr_used || false);

      setConfidenceScores({
        policyholderName: data.policyholderName_confidence,
        issueDate: data.issueDate_confidence,
        expirationDate: data.expirationDate_confidence,
        providerName: data.providerName_confidence,
        policyholderAddress: data.policyholderAddress_confidence,
        policyNumber: data.policyNumber_confidence,
        premiumAmount: data.premiumAmount_confidence,
        deductibles: data.deductibles_confidence,
      });

      setFormData({
        policyholderName: data.policyholderName || "",
        issueDate: formatDate(data.issueDate),
        expirationDate: formatDate(data.expirationDate),
        providerName: data.providerName || "",
        policyholderAddress: data.policyholderAddress || "",
        policyNumber: data.policyNumber || "",
        premiumAmount: data.premiumAmount || "",
        deductibles: data.deductibles || "",
        termsAndExclusions: Array.isArray(data.termsAndExclusions)
          ? data.termsAndExclusions.join(", ")
          : data.termsAndExclusions || "",
      });

      issueDateVariantsRef.current = [
        data.issueDateRaw || data.issueDate || "",
      ];
      expirationDateVariantsRef.current = [data.expirationDateRaw || data.expirationDate || ""];

      const terms = [
        data.policyholderName,
        data.issueDateRaw,
        data.expirationDateRaw,
        data.providerName,
        data.policyholderAddress,
        data.policyNumber,
        data.premiumAmount,
        data.deductibles,
        ...(Array.isArray(data.termsAndExclusions)
          ? data.termsAndExclusions
          : []),
      ]
        .map((t) => (typeof t === "string" ? t.trim().toLowerCase() : ""))
        .filter(Boolean);

      setHighlights(terms);
      setHighlightRects([]);
      setIsExtracted(true);

    })
    .catch((err) => console.error("Extraction error", err))
    .finally(() => setLoading(false)); // Stop spinner
};


  const onDocumentLoad = ({ numPages }) => {
    setNumPages(numPages);
    pageRefs.current = Array(numPages)
      .fill()
      .map(() => React.createRef());
    textLayersRef.current = Array(numPages).fill(null);
    setHighlightRects([]);
  };

 const computeHighlights = useCallback(() => {
  if (!textLayersRef.current.length) return;
  const rects = [];
  const seenTerms = new Set();
  const allTerms = [...highlights];
  if (searchTerm.trim()) allTerms.push(searchTerm.trim());

  allTerms.forEach((termRaw) => {
    const term = termRaw?.toLowerCase().trim();
    if (!term || seenTerms.has(term)) return;
    seenTerms.add(term);

    for (let pageIndex = 0; pageIndex < numPages; pageIndex++) {
      const textLayer = textLayersRef.current[pageIndex];
      if (!textLayer) continue;

      const spans = Array.from(textLayer.querySelectorAll("span"));
      let found = false;

      for (let i = 0; i < spans.length; i++) {
        const windowSize = 6;
        const windowSpans = spans.slice(i, i + windowSize);
        const combinedText = windowSpans.map((s) => s.textContent).join("");
        const clean = (s) => s.replace(/\s+/g, "").toLowerCase();
        const combinedNorm = clean(combinedText);
        const termNorm = clean(term);
        const matchIndex = combinedNorm.indexOf(termNorm);

        if (matchIndex === -1) continue;

        // Find start and end offset
        let currentOffset = 0;
        let startSpan = null, endSpan = null;
        let startOffset = 0, endOffset = 0;

        for (let k = 0; k < windowSpans.length; k++) {
          const span = windowSpans[k];
          const text = span.textContent || "";
          const textClean = clean(text);
          const spanLength = textClean.length;

          if (!startSpan && matchIndex >= currentOffset && matchIndex < currentOffset + spanLength) {
            startSpan = span.firstChild;
            startOffset = matchIndex - currentOffset;
          }

          if (!endSpan && (matchIndex + termNorm.length) <= currentOffset + spanLength) {
            endSpan = span.firstChild;
            endOffset = matchIndex + termNorm.length - currentOffset;
            break;
          }

          currentOffset += spanLength;
        }

        if (startSpan && endSpan) {
          try {
            const range = document.createRange();
            range.setStart(startSpan, startOffset);
            range.setEnd(endSpan, endOffset);
            const clientRects = range.getClientRects();
            const containerRect = textLayer.getBoundingClientRect();

            for (const rect of clientRects) {
              rects.push({
                term: termRaw,
                pageIndex,
                top: (rect.top - containerRect.top) / zoom,
                left: (rect.left - containerRect.left) / zoom,
                width: rect.width / zoom,
                height: rect.height / zoom,
              });
            }

            found = true;
            break;
          } catch (err) {
            console.warn("Range error:", err);
          }
        }
      }

      if (found) break;
    }
  });

  setHighlightRects(rects);
}, [highlights, searchTerm, numPages, zoom]);


  useEffect(() => {
    computeHighlights();
  }, [computeHighlights]);

  const onGetTextSuccess = (pageIndex) => {
    const textLayer = document.querySelectorAll(
      ".react-pdf__Page__textContent"
    )[pageIndex];
    if (textLayer) {
      textLayersRef.current[pageIndex] = textLayer;
      computeHighlights();
    }
  };

  const scrollToTerm = (term) => {
    if (!term || typeof term !== "string") return;
    const rect = highlightRects.find(
      (r) =>
        typeof r.term === "string" &&
        r.term.toLowerCase() === term.toLowerCase()
    );
    if (rect && pageRefs.current[rect.pageIndex]?.current) {
      pageRefs.current[rect.pageIndex].current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  const scrollToFirstDate = () => {
    const dateVariants = issueDateVariantsRef.current || [];
    for (let variant of dateVariants) {
      const match = highlightRects.find(
        (r) =>
          typeof r.term === "string" &&
          r.term.toLowerCase() === variant.toLowerCase()
      );
      if (match && pageRefs.current[match.pageIndex]?.current) {
        pageRefs.current[match.pageIndex].current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        break;
      }
    }
  };
  const scrollToExpirationDate = () => {
  const dateVariants = expirationDateVariantsRef.current || [];
  for (let variant of dateVariants) {
    const match = highlightRects.find(
      (r) =>
        typeof r.term === "string" &&
        r.term.toLowerCase() === variant.toLowerCase()
    );
    if (match && pageRefs.current[match.pageIndex]?.current) {
      pageRefs.current[match.pageIndex].current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      break;
    }
  }
};


  const handleSave = () => {
    if (!pdfId) {
      console.error("No PDF ID. Please extract data first.");
      return;
    }

    const userUpdatedData = {};
    Object.keys(formData).forEach((key) => {
      if (key === "termsAndExclusions") {
  const newArr = formData[key]
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const origArr = Array.isArray(originalData[key])
    ? originalData[key].map((item) => item.trim()).filter(Boolean)
    : [];

  const arraysEqual =
    newArr.length === origArr.length &&
    newArr.every((val, idx) => val === origArr[idx]);

  if (!arraysEqual) userUpdatedData[key] = newArr;
}
 
      else {
        if ((formData[key] || "") !== (originalData[key] || "")) {
          userUpdatedData[key] = formData[key];
        }
      }
    });

    const payload = {
  pdf_id: pdfId,
  pdfName: pdfFile?.name || "Unnamed PDF",
  ai_data: originalData,
  user_updated_data:
    Object.keys(userUpdatedData).length > 0 ? userUpdatedData : null,
  user_id: localStorage.getItem("token"), // ✅ ADD THIS
};


    fetch("/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => console.log(data.message || "Saved"))
      .catch((err) => console.error("Save error", err));
  };
const scrollToPage = (pageNum) => {
  const index = pageNum - 1;
  if (pageRefs.current[index]?.current) {
    pageRefs.current[index].current.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
};

  return (
    <div className="pdf-extractor">
      <div className="left-panel">
 <h3>Upload PDF</h3>
<div className="field">
  <input
    type="file"
    accept="application/pdf"
    onChange={handleFile}
  />
</div>
<div className="button-group">
  <button
    className="extract-btn"
    onClick={handleExtract}
    disabled={!pdfFile || loading}
  >
    {loading ? (
      <div className="spinner" />
    ) : (
      "Extract"
    )}
  </button>


  <button
    className="save-btn"
    onClick={handleSave}
    disabled={!isExtracted}
  >
    Save
  </button>

</div>
  <div className="field">
    <label>Policyholder Name</label>
    <input
      value={formData.policyholderName}
      onClick={() =>
        ocrUsed
          ? scrollToPage(originalData.policyholderName_page || 1)
          : scrollToTerm(formData.policyholderName)
      }
      onChange={(e) =>
        setFormData((prev) => ({ ...prev, policyholderName: e.target.value }))
      }
    />
    {confidenceScores.policyholderName != null && (
      <small>Confidence: {confidenceScores.policyholderName}%</small>
    )}
  </div>

  <div className="field">
    <label>Date of Issue</label>
    <input
      type="date"
      value={formData.issueDate}
      onClick={() =>
        ocrUsed
          ? scrollToPage(originalData.issueDate_page || 1)
          : scrollToFirstDate()
      }
      onChange={(e) =>
        setFormData((prev) => ({ ...prev, issueDate: e.target.value }))
      }
    />
    {confidenceScores.issueDate != null && (
      <small>Confidence: {confidenceScores.issueDate}%</small>
    )}
  </div>

  <div className="field">
    <label>Expiration Date</label>
    <input
      type="date"
      value={formData.expirationDate}
      onClick={() =>
        ocrUsed
          ? scrollToPage(originalData.expirationDate_page || 1)
          : scrollToExpirationDate()
      }
      onChange={(e) =>
        setFormData((prev) => ({ ...prev, expirationDate: e.target.value }))
      }
    />
    {confidenceScores.expirationDate != null && (
      <small>Confidence: {confidenceScores.expirationDate}%</small>
    )}
  </div>

  <div className="field">
    <label>Provider Name</label>
    <input
      value={formData.providerName}
      onClick={() =>
        ocrUsed
          ? scrollToPage(originalData.providerName_page || 1)
          : scrollToTerm(formData.providerName)
      }
      onChange={(e) =>
        setFormData((prev) => ({ ...prev, providerName: e.target.value }))
      }
    />
    {confidenceScores.providerName != null && (
      <small>Confidence: {confidenceScores.providerName}%</small>
    )}
  </div>

  <div className="field">
    <label>Policyholder Address</label>
    <input
      value={formData.policyholderAddress}
      onClick={() =>
        ocrUsed
          ? scrollToPage(originalData.policyholderAddress_page || 1)
          : scrollToTerm(formData.policyholderAddress)
      }
      onChange={(e) =>
        setFormData((prev) => ({ ...prev, policyholderAddress: e.target.value }))
      }
    />
    {confidenceScores.policyholderAddress != null && (
      <small>Confidence: {confidenceScores.policyholderAddress}%</small>
    )}
  </div>

  <div className="field">
    <label>Policy Number</label>
    <input
      value={formData.policyNumber}
      onClick={() =>
        ocrUsed
          ? scrollToPage(originalData.policyNumber_page || 1)
          : scrollToTerm(formData.policyNumber)
      }
      onChange={(e) =>
        setFormData((prev) => ({ ...prev, policyNumber: e.target.value }))
      }
    />
    {confidenceScores.policyNumber != null && (
      <small>Confidence: {confidenceScores.policyNumber}%</small>
    )}
  </div>

  <div className="field">
    <label>Premium Amount</label>
    <input
      value={formData.premiumAmount}
      onClick={() =>
        ocrUsed
          ? scrollToPage(originalData.premiumAmount_page || 1)
          : scrollToTerm(formData.premiumAmount)
      }
      onChange={(e) =>
        setFormData((prev) => ({ ...prev, premiumAmount: e.target.value }))
      }
    />
    {confidenceScores.premiumAmount != null && (
      <small>Confidence: {confidenceScores.premiumAmount}%</small>
    )}
  </div>

  <div className="field">
    <label>Deductibles & Premiums</label>
    <input
      value={formData.deductibles}
      onClick={() =>
        ocrUsed
          ? scrollToPage(originalData.deductibles_page || 1)
          : scrollToTerm(formData.deductibles)
      }
      onChange={(e) =>
        setFormData((prev) => ({ ...prev, deductibles: e.target.value }))
      }
    />
    {confidenceScores.deductibles != null && (
      <small>Confidence: {confidenceScores.deductibles}%</small>
    )}
  </div>

  <div className="field">
    <label>Terms & Exclusions</label>
    <textarea
      value={formData.termsAndExclusions}
      onClick={() =>
        ocrUsed
          ? scrollToPage(
              originalData.termsAndExclusions_page || 1
            )
          : scrollToTerm(formData.termsAndExclusions.split(",")[0] || "")
      }
      onChange={(e) =>
        setFormData((prev) => ({
          ...prev,
          termsAndExclusions: e.target.value,
        }))
      }
    />
  </div>

  <button onClick={handleSave}>Save</button>
</div>


      <div className="right-panel">
        
<div className="toolbar">
  <div className="toolbar-section page-info">
    <input
      type="number"
      value={currentPage}
      min={1}
      max={numPages || 1}
      onChange={(e) => {
        const val = parseInt(e.target.value);
        setCurrentPage(val);
        scrollToPage(val);
      }}
    />
    <span>/ {numPages || "-"}</span>
  </div>

  <div className="toolbar-section zoom-controls">
    <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}><FiMinus /></button>
    <span className="zoom-label">{Math.round(zoom * 100)}%</span>
    <button onClick={() => setZoom((z) => Math.min(3, z + 0.1))}><FiPlus /></button>
  </div>

  <div className="toolbar-section page-fit">
    <button title="Fit to Screen"><MdFitScreen size={18} /></button>
  </div>

  <div className="toolbar-section search-box">
    <input
      type="text"
      placeholder="Search"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && searchTerm.trim()) {
          scrollToTerm(searchTerm.trim());
        }
      }}
    />
  </div>
</div>



        <div className="pdf-viewer-container" ref={viewerRef}>
          <div className="pdf-viewer">
            {pdfFile && (
              <Document file={pdfFile} onLoadSuccess={onDocumentLoad}>
                {Array.from({ length: numPages }, (_, i) => (
                  <div
                    key={i}
                    className="page-wrapper"
                    ref={pageRefs.current[i]}
                  >
                    <Page
                       pageNumber={i + 1}
                       scale={zoom}
                      onRenderSuccess={() => setCurrentPage(i + 1)}
                        onGetTextSuccess={() => onGetTextSuccess(i)}
                    />
                    {highlightRects
                      .filter((h) => h.pageIndex === i)
                      .map((h, j) => (
                        <div
                          key={j}
                          className="highlight-box"
                          style={{
                            top: `${h.top * zoom}px`,
                            left: `${h.left * zoom}px`,
                            width: `${h.width * zoom}px`,
                            height: `${h.height * zoom}px`,
                          }}
                        />
                      ))}
                  </div>
                ))}
              </Document>
            )}
          </div>
        </div>
      </div>


      <Chatbot pdfId={pdfId} />
    </div>
  );
}

export default PDFExtractor;