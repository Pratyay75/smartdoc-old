import React, { useState, useRef, useEffect } from "react";
import { Viewer, Worker, SpecialZoomLevel } from "@react-pdf-viewer/core";
import { zoomPlugin } from "@react-pdf-viewer/zoom";
import { pageNavigationPlugin } from "@react-pdf-viewer/page-navigation";
import { searchPlugin } from "@react-pdf-viewer/search";

import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/zoom/lib/styles/index.css";
import "@react-pdf-viewer/page-navigation/lib/styles/index.css";
import "@react-pdf-viewer/search/lib/styles/index.css";
import "./CompareSideBySide.css";

const PDFJS_WORKER_URL =
    "https://unpkg.com/pdfjs-dist@2.16.105/build/pdf.worker.min.js";

function CompareSideBySide() {
    const [file1, setFile1] = useState(null);
    const [file2, setFile2] = useState(null);
    const [docLoaded1, setDocLoaded1] = useState(false);
    const [docLoaded2, setDocLoaded2] = useState(false);

    // Plugins
    const zoomPlugin1 = zoomPlugin();
    const navPlugin1 = pageNavigationPlugin();
    const searchPlugin1 = searchPlugin();

    const zoomPlugin2 = zoomPlugin();
    const navPlugin2 = pageNavigationPlugin();
    const searchPlugin2 = searchPlugin();

    const { ZoomIn, ZoomOut, Zoom } = zoomPlugin1;
    const { CurrentPageInput, GoToNextPage, GoToPreviousPage, jumpToPage } = navPlugin1;
    const { Search } = searchPlugin1;

    const { ZoomIn: ZoomIn2, ZoomOut: ZoomOut2, Zoom: Zoom2 } = zoomPlugin2;
    const { CurrentPageInput: CurrentPageInput2, GoToNextPage: GoToNextPage2, GoToPreviousPage: GoToPreviousPage2, jumpToPage: jumpToPage2 } = navPlugin2;
    const { Search: Search2 } = searchPlugin2;

    // Refs for scroll sync
    const panel1Ref = useRef(null);
    const panel2Ref = useRef(null);
    const syncingScroll = useRef(false);
    const syncingPage = useRef(false);

    const findScroller = (panel) => panel?.querySelector(".rpv-core__inner-pages") || panel;

    // Scroll sync: runs whenever PDFs or docLoaded change
    useEffect(() => {
        if (!docLoaded1 || !docLoaded2) return;
        if (!panel1Ref.current || !panel2Ref.current) return;

        const scroller1 = findScroller(panel1Ref.current);
        const scroller2 = findScroller(panel2Ref.current);
        if (!scroller1 || !scroller2) return;

        const handleScroll = (source, target) => {
            if (syncingScroll.current) return;
            syncingScroll.current = true;
            requestAnimationFrame(() => {
                const ratio = source.scrollTop / (source.scrollHeight - source.clientHeight || 1);
                target.scrollTop = ratio * (target.scrollHeight - target.clientHeight);
                syncingScroll.current = false;
            });
        };

        const handleScroll1 = () => handleScroll(scroller1, scroller2);
        const handleScroll2 = () => handleScroll(scroller2, scroller1);

        scroller1.addEventListener("scroll", handleScroll1);
        scroller2.addEventListener("scroll", handleScroll2);

        return () => {
            scroller1.removeEventListener("scroll", handleScroll1);
            scroller2.removeEventListener("scroll", handleScroll2);
        };
    }, [docLoaded1, docLoaded2, file1, file2]); // Added file1 & file2 here

    // Page sync
    const syncPage = (page, source = 1) => {
        if (syncingPage.current) return;
        syncingPage.current = true;
        if (source === 1 && jumpToPage2) jumpToPage2(page);
        if (source === 2 && jumpToPage) jumpToPage(page);
        setTimeout(() => (syncingPage.current = false), 30);
    };

    const handlePageChange1 = (e) => syncPage(e.currentPage, 1);
    const handlePageChange2 = (e) => syncPage(e.currentPage, 2);

    // Search sync
    const handleSearchNavigation = (props, source = 1) => {
        const currentPage = props.currentMatch?.pageIndex;
        if (currentPage !== undefined) syncPage(currentPage, source);
    };

    // File select
    const handleSelect = (setter, setLoaded) => (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setLoaded(false); // reset docLoaded
        setter(URL.createObjectURL(f));
    };

    // Compare handler (fetches annotated PDFs)
    const handleCompare = async () => {
        const inputs = document.querySelectorAll('input[type="file"]');
        if (inputs.length < 2 || !inputs[0].files[0] || !inputs[1].files[0]) {
            alert("Upload both PDFs first");
            return;
        }
        const formData = new FormData();
        formData.append("file1", inputs[0].files[0]);
        formData.append("file2", inputs[1].files[0]);

        try {
            const res = await fetch("/compare-sbs", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();

            const blob1 = new Blob(
                [new Uint8Array(data.pdf1.split("").map((c) => c.charCodeAt(0)))],
                { type: "application/pdf" }
            );
            const blob2 = new Blob(
                [new Uint8Array(data.pdf2.split("").map((c) => c.charCodeAt(0)))],
                { type: "application/pdf" }
            );

            setDocLoaded1(false); // reset before new file
            setDocLoaded2(false);

            setFile1(URL.createObjectURL(blob1));
            setFile2(URL.createObjectURL(blob2));
        } catch (err) {
            console.error("Compare failed:", err);
        }
    };

    return (
        <div className="csb-container">
            {/* Upload panel */}
            <div className="csb-left-panel">
                <h3>📄 Side-by-Side Compare</h3>

                <div className="csb-field">
                    <label>Upload Original PDF</label>
                    <input type="file" accept="application/pdf" onChange={handleSelect(setFile1, setDocLoaded1)} />
                </div>

                <div className="csb-field">
                    <label>Upload Revised PDF</label>
                    <input type="file" accept="application/pdf" onChange={handleSelect(setFile2, setDocLoaded2)} />
                </div>

                <div className="csb-field">
    <button className="csb-compare-btn" onClick={handleCompare}>
        Compare
    </button>
</div>

            </div>

            {/* Viewer area */}
            <div className="csb-viewer-container">
                <Worker workerUrl={PDFJS_WORKER_URL}>
                    {/* Original Document */}
                    <div className="csb-pdf-wrapper">
                        <div className="csb-toolbar">
                            <span className="csb-doc-title">Original Document</span>
                            <ZoomOut />
                            <Zoom />
                            <ZoomIn />
                            <GoToPreviousPage />
                            <CurrentPageInput />
                            <GoToNextPage />
                            <Search>
                                {(props) => (
                                    <div className="csb-search">
                                        <input
                                            type="text"
                                            placeholder="Search..."
                                            value={props.keyword || ""}
                                            onChange={(e) => props.setKeyword(e.target.value)}
                                        />
                                        <button onClick={() => { props.search(); handleSearchNavigation(props, 1); }}>Go</button>
                                        <button onClick={props.clear}>Clear</button>
                                    </div>
                                )}
                            </Search>
                        </div>

                        <div className="csb-pdf-panel" ref={panel1Ref}>
                            {file1 ? (
                                <Viewer
                                    fileUrl={file1}
                                    defaultScale={SpecialZoomLevel.PageWidth}
                                    plugins={[zoomPlugin1, navPlugin1, searchPlugin1]}
                                    onPageChange={handlePageChange1}
                                    onDocumentLoad={() => setDocLoaded1(true)}
                                />
                            ) : (
                                <div className="csb-placeholder">Upload Original PDF</div>
                            )}
                        </div>
                    </div>

                    {/* Revised Document */}
                    <div className="csb-pdf-wrapper">
                        <div className="csb-toolbar">
                            <span className="csb-doc-title">Revised Document</span>
                            <ZoomOut2 />
                            <Zoom2 />
                            <ZoomIn2 />
                            <GoToPreviousPage2 />
                            <CurrentPageInput2 />
                            <GoToNextPage2 />
                            <Search2>
                                {(props) => (
                                    <div className="csb-search">
                                        <input
                                            type="text"
                                            placeholder="Search..."
                                            value={props.keyword || ""}
                                            onChange={(e) => props.setKeyword(e.target.value)}
                                        />
                                        <button onClick={() => { props.search(); handleSearchNavigation(props, 2); }}>Go</button>
                                        <button onClick={props.clear}>Clear</button>
                                    </div>
                                )}
                            </Search2>
                        </div>

                        <div className="csb-pdf-panel" ref={panel2Ref}>
                            {file2 ? (
                                <Viewer
                                    fileUrl={file2}
                                    defaultScale={SpecialZoomLevel.PageWidth}
                                    plugins={[zoomPlugin2, navPlugin2, searchPlugin2]}
                                    onPageChange={handlePageChange2}
                                    onDocumentLoad={() => setDocLoaded2(true)}
                                />
                            ) : (
                                <div className="csb-placeholder">Upload Revised PDF</div>
                            )}
                        </div>
                    </div>
                </Worker>
            </div>
        </div>
    );
}

export default CompareSideBySide;
