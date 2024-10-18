import { useState, useEffect, useCallback, useRef } from "react";

import {
  AreaHighlight,
  Highlight,
  PdfHighlighter,
  PdfLoader,
  Popup,
  Tip,
} from "./react-pdf-highlighter";
import type { IHighlight, NewHighlight } from "./react-pdf-highlighter";

import { Spinner } from "./Spinner";
import { testHighlights as _testHighlights } from "./test-highlights";

import "./style/App.css";
import "../../dist/style.css";
import type { PDFDocumentProxy } from "pdfjs-dist";

const testHighlights: Record<string, Array<IHighlight>> = _testHighlights;

const getNextId = () => String(Math.random()).slice(2);

const parseIdFromHash = () =>
  document.location.hash.slice("#highlight-".length);

const resetHash = () => {
  document.location.hash = "";
};

const HighlightPopup = ({
  comment,
}: {
  comment: { text: string; emoji: string };
}) =>
  comment.text ? (
    <div className="Highlight__popup">
      {comment.emoji} {comment.text}
    </div>
  ) : null;

const PRIMARY_PDF_URL = "https://arxiv.org/pdf/1708.08021";

const searchParams = new URLSearchParams(document.location.search);
const initialUrl = searchParams.get("url") || PRIMARY_PDF_URL;

export function App() {
  const [url] = useState(initialUrl);
  const [highlights, setHighlights] = useState<Array<IHighlight>>(
    testHighlights[initialUrl] ? [...testHighlights[initialUrl]] : []
  );

  const scrollViewerTo = useRef((highlight: IHighlight) => {
    // Implement scrolling logic here
  });

  const scrollToHighlightFromHash = useCallback(() => {
    const highlight = getHighlightById(parseIdFromHash());
    if (highlight) {
      scrollViewerTo.current(highlight);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("hashchange", scrollToHighlightFromHash, false);
    return () => {
      window.removeEventListener(
        "hashchange",
        scrollToHighlightFromHash,
        false,
      );
    };
  }, [scrollToHighlightFromHash]);

  const getHighlightById = (id: string) => {
    return highlights.find((highlight) => highlight.id === id);
  };

  const addHighlight = (highlight: NewHighlight) => {
    console.log("Saving highlight", highlight);
    setHighlights((prevHighlights) => [
      { ...highlight, id: getNextId() },
      ...prevHighlights,
    ]);
  };

  const renderPage = (pdfDocument: PDFDocumentProxy) => {
    return (
      <PdfHighlighter
        pdfDocument={pdfDocument}
        enableAreaSelection={(event) => event.altKey}
        onScrollChange={resetHash}
        scrollRef={(scrollTo) => {
          scrollViewerTo.current = scrollTo;
          scrollToHighlightFromHash();
        }}
        onSelectionFinished={(
          position,
          content,
          hideTipAndSelection,
          transformSelection,
        ) => (
          <Tip
            onOpen={transformSelection}
            onConfirm={(comment) => {
              addHighlight({ content, position, comment });
              hideTipAndSelection();
            }}
          />
        )}
        highlightTransform={({
          highlight,
          index,
          setTip,
          hideTip,
          isScrolledTo,
        }) => {
          const isTextHighlight = !highlight.content?.image;

          const component = isTextHighlight ? (
            <Highlight
              isScrolledTo={isScrolledTo}
              position={highlight.position}
              comment={highlight.comment}
            />
          ) : (
            <AreaHighlight isScrolledTo={isScrolledTo} highlight={highlight} />
          );

          return (
            <Popup
              popupContent={<HighlightPopup {...highlight} />}
              onMouseOver={(popupContent) =>
                setTip(highlight, () => popupContent)
              }
              onMouseOut={hideTip}
              key={index}
            >
              {component}
            </Popup>
          );
        }}
        highlights={highlights}
      />
    );
  };

  return (
    <div className="App" style={{ display: "flex", height: "100vh" }}>
      <PdfLoader url={url} beforeLoad={<Spinner />}>
        {(pdfDocument) => renderPage(pdfDocument)}
      </PdfLoader>
    </div>
  );
}
