"use client";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import dynamic from 'next/dynamic'
import { useToast } from "@/components/ui/use-toast";
import { Document, Page, pdfjs } from "react-pdf";
// import { useResizeObserver } from '@wojtekmaj/react-hooks';
import axios from "axios";

// pdfjs.GlobalWorkerOptions.workerSrc = new URL(
//   'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
//   import.meta.url
// ).toString();

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// const options = {
//   cMapUrl: "/cmaps/",
//   standardFontDataUrl: "/standard_fonts/",
// };

const ViewPdf: React.FC = () => {
  const { toast } = useToast();
  const params = useParams<{ pdfPath: string }>();
  const decodedPath = decodeURIComponent(params.pdfPath);
  const [pdfUrl, setPdfUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (decodedPath) {
      const fetchPdf = async () => {
        try {
          setIsLoading(true);
          
          let username: string;
          let filename: string;
          
          // Parse the path - supports two formats:
          // 1. Full path: "username/pdfs/filename.pdf"
          // 2. Filename only: "filename.pdf" (backward compatibility)
          const pathParts = decodedPath.split('/');
          
          if (pathParts.length >= 3) {
            // Format 1: Full path with username/pdfs/filename
            username = pathParts[0];
            filename = pathParts[2]; // Skip "pdfs" middle part
          } else if (pathParts.length === 1) {
            // Format 2: Just filename - extract username from filename
            // Filename format: username_timestamp.pdf (or .docx)
            filename = pathParts[0];
            const filenameParts = filename.replace('.pdf', '').replace('.docx', '').split('_');
            username = filenameParts[0]; // Username is before first underscore
            
            // Ensure filename has .pdf extension for display
            if (!filename.endsWith('.pdf')) {
              throw new Error('Only PDF files can be viewed. Please use download for Word documents.');
            }
          } else {
            throw new Error('Invalid PDF path format. Expected "username/pdfs/filename.pdf" or "filename.pdf"');
          }
          
          console.log('Fetching PDF:', { username, filename, fullPath: decodedPath });
          
          // Fetch from Python backend with new URL structure
          const response = await axios.get(
            `${process.env.NEXT_PUBLIC_PYTHON_BASE_URL}/download-pdf/${username}/${filename}`,
            {
              responseType: "blob",
            }
          );

          const url = window.URL.createObjectURL(new Blob([response.data]));
          setPdfUrl(url);
          setIsLoading(false);
        } catch (error) {
          console.error("Error fetching the PDF file", error);
          setIsLoading(false);
          toast({
            variant: "destructive",
            title: "Failed to load PDF",
            description: "Could not fetch the PDF file. Please try downloading instead.",
          });
        }
      };

      fetchPdf();
    }
    
    // Cleanup blob URL on unmount
    return () => {
      if (pdfUrl) {
        window.URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [decodedPath, toast]);

  const [pageNumber, setPageNumber] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>();
  const [containerRef, setContainerRef] = useState<HTMLElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>();

  const onResize = useCallback<ResizeObserverCallback>((entries) => {
    const [entry] = entries;

    if (entry) {
      setContainerWidth(entry.contentRect.width);
    }
  }, []);

  // Set up ResizeObserver to track container width changes
  useEffect(() => {
    if (!containerRef) return;

    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(containerRef);

    return () => {
      resizeObserver.disconnect();
    };
  }, [containerRef, onResize]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
    setTimeout(() => {
        const pdfPages = document.querySelectorAll(".react-pdf__Page");
        const pdfPagesCanvas = document.querySelectorAll(".react-pdf__Page__canvas");
        
        pdfPages.forEach((page) => {
          page.classList.add("rounded-xl", "shadow-lg", "mb-4");
        });
        pdfPagesCanvas.forEach((page) => {
          page.classList.add("rounded-xl");
        });
    }, 100);
  }

  return (
    <section className="">
      <div className="color"></div>
      <div className="color"></div>
      <div className="Example__container ">
        <div className="Example__container__document " ref={setContainerRef}>
          {isLoading ? (
            <div className="flex items-center justify-center h-screen">
              <div className="text-white text-xl">Loading PDF...</div>
            </div>
          ) : pdfUrl ? (
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex items-center justify-center h-screen">
                  <div className="text-white text-xl">Rendering PDF...</div>
                </div>
              }
              error={
                <div className="flex items-center justify-center h-screen">
                  <div className="text-red-500 text-xl">Failed to load PDF</div>
                </div>
              }
            >
              {Array.from(new Array(numPages), (el, index) => (
                <div 
                  key={`page_wrapper_${index + 1}`} 
                  className="rounded-xl overflow-hidden shadow-lg mb-4 bg-transparent"
                >
                  <Page
                    pageNumber={index + 1}
                    width={containerWidth ? Math.min(containerWidth, 800) : undefined}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                </div>
              ))}
            </Document>
          ) : (
            <div className="flex items-center justify-center h-screen">
              <div className="text-red-500 text-xl">No PDF available</div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ViewPdf;
