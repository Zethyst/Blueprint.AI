"use client";
import type { Metadata } from "next";
import React, { useEffect, useState, useRef } from "react";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DownloadIcon from "@mui/icons-material/Download";
import axios, { AxiosError } from "axios";
import { useToast } from "@/components/ui/use-toast";
import { useParams, useRouter } from "next/navigation";
import { APIResponse } from "@/types/APIResponse";
import { useSession } from "next-auth/react";
import { debounce } from "lodash";
import Link from "next/link";
import Image from "next/image";
import lockImage from "../../assets/locker.png";
import Stars from "./Stars";
import Praise from "./Praise";
import SRSModel from "@/models/SRS";

interface SRSStreamData {
  status: 'initiated' | 'processing' | 'completed' | 'error';
  message: string;
  title?: string;
  pdfName?: string;
  wordName?: string;
  pdfPath?: string;
  wordPath?: string;
  text?: string;
}

function Page() {
  const { toast } = useToast();
  const { data: session, status } = useSession();
  const [pdfName, setPdfName] = useState("");
  const [wordName, setWordName] = useState("");
  const [pdfPath, setPdfPath] = useState("");
  const [wordPath, setWordPath] = useState("");
  const [srsTitle, setSrsTitle] = useState("");
  const [finish, setFinish] = useState(false);
  const [rating, setRating] = useState<number | null>(0);
  const [praises, setPraises] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState("Preparing to generate...");
  const [generationLogs, setGenerationLogs] = useState<string[]>([]);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Store user info in localStorage when session is available
  useEffect(() => {
    if (session?.user) {
      console.log("session.user", session.user);
      
      const userId = (session.user as any)._id;
      const username = (session.user as any).username || session.user.email?.split('@')[0] || 'user';
      
      // Only store if we have a valid userId
      if (userId) {
        const userInfo = {
          userId,
          username
        };
        localStorage.setItem('srs_user_info', JSON.stringify(userInfo));
      } else {
        console.warn('User session missing _id. OAuth users may need to sign in again.');
      }
    }
  }, [session]);

  // SSE consumption effect
  useEffect(() => {
    const startSSEGeneration = async () => {
      // Check if there's an active generation in localStorage
      const isGenerationActive = localStorage.getItem('srs_generation_active');
      const storedData = localStorage.getItem('srs_generation_data');
      
      if (!isGenerationActive || !storedData) {
        // Check if there's a completed result
        const storedResult = localStorage.getItem('srs_result');
        if (storedResult) {
          try {
            const result = JSON.parse(storedResult);
            setPdfName(result.pdfName);
            setWordName(result.wordName);
            setPdfPath(result.pdfPath);
            setWordPath(result.wordPath);
            setSrsTitle(result.title);
            setFinish(true);
            setProgress(600);
          } catch (e) {
            console.error('Error parsing stored result:', e);
          }
        }
        return;
      }

      try {
        const srsData = JSON.parse(storedData);
        
        // Add user information from session
        const userData = localStorage.getItem('srs_user_info');
        if (userData) {
          const { userId, username } = JSON.parse(userData);
          srsData.userId = userId;
          srsData.username = username;
        }
        
        abortControllerRef.current = new AbortController();
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_PYTHON_BASE_URL}/generate-srs-stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
          },
          body: JSON.stringify(srsData),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        readerRef.current = reader || null;
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('Response body is null');
        }

        let buffer = '';
        let eventCount = 0;
        const totalSteps = 7;

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('event: close')) {
              console.log('Stream closed by server');
              return;
            }

            if (line.startsWith('data: ')) {
              const data = line.substring(6);
              try {
                const parsed: SRSStreamData = JSON.parse(data);
                
                // Update UI with progress
                setCurrentMessage(parsed.message);
                setGenerationLogs(prev => [...prev, parsed.message]);

                eventCount++;
                const progressWidth = Math.min((eventCount / totalSteps) * 600, 600);
                setProgress(progressWidth);

                if (parsed.status === 'completed') {
                  setPdfName(parsed.pdfName || '');
                  setWordName(parsed.wordName || '');
                  setPdfPath(parsed.pdfPath || '');
                  setWordPath(parsed.wordPath || '');
                  setSrsTitle(parsed.title || '');
                  setFinish(true);
                  setProgress(600);
                  
                  // Store result
                  localStorage.setItem('srs_result', JSON.stringify(parsed));
                  localStorage.removeItem('srs_generation_active');
                  
                  toast({
                    variant: "success",
                    title: "SRS Generated Successfully!",
                    description: `${parsed.title} is ready to download`,
                  });
                } else if (parsed.status === 'error') {
                  setCurrentMessage(`Error: ${parsed.message}`);
                  localStorage.removeItem('srs_generation_active');
                  
                  toast({
                    variant: "destructive",
                    title: "Generation Failed",
                    description: parsed.message,
                  });
                }
              } catch (e) {
                console.error('Failed to parse SSE data:', e);
              }
            }
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('SSE connection aborted');
          return;
        }
        console.error('Error during SSE generation:', error);
        toast({
          variant: "destructive",
          title: "Connection Error",
          description: "Failed to connect to generation service",
        });
        localStorage.removeItem('srs_generation_active');
      }
    };

    startSSEGeneration();

    // Cleanup on unmount
    return () => {
      if (readerRef.current) {
        readerRef.current.cancel();
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [toast]);

  const saveReview = async (rating: number | null, praises: string[]) => {
    try {
      const response = await axios.post(`/api/save-review`, {
        rating,
        praises,
      });
      console.log("Review saved successfully", response.data);
    } catch (error) {
      console.error("Error saving SRS review", error);
    }
  };

  // Debounced function to save review
  const debouncedSaveReview = debounce(saveReview, 5000);

  useEffect(() => {
    debouncedSaveReview(rating, praises);
    // Cancel the debounce on component unmount
    return () => {
      debouncedSaveReview.cancel();
    };
  }, [rating, praises]);

  const handleDownload = async (type: 'pdf' | 'word' = 'pdf') => {
    try {
      const path = type === 'pdf' ? pdfPath : wordPath;
      const filename = type === 'pdf' ? pdfName : wordName;
      
      if (!path || !filename) {
        toast({
          variant: "destructive",
          title: "File not available",
          description: "The document is not ready yet",
        });
        return;
      }

      // Extract username and filename from path (format: "username/pdfs/file.pdf")
      const pathParts = path.split('/');
      const username = pathParts[0];
      const actualFilename = pathParts[2];
      
      const endpoint = type === 'pdf' ? 'download-pdf' : 'download-word';
      const url = `${process.env.NEXT_PUBLIC_PYTHON_BASE_URL}/${endpoint}/${username}/${actualFilename}`;
      
      const response = await axios.get(url, {
        responseType: "blob",
      });

      const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", actualFilename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Error downloading the file", error);
      const axiosError = error as AxiosError<APIResponse>;
      let errorMessage = axiosError.response?.data.message || "Failed to download file";
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: errorMessage,
      });
    }
  };

  const handleView = () => {
    if (!pdfPath) {
      toast({
        variant: "destructive",
        title: "PDF not available",
        description: "The PDF is not ready yet",
      });
      return;
    }
    
    window.open(`/view-pdf/${encodeURIComponent(pdfPath)}`, "_blank");
  };

  useEffect(() => {
    if (pdfName) {
      setFinish(true);
    }
  }, [pdfName]);

  return (
    <section className="">
      <div className="color"></div>
      <div className="color"></div>
      <div className="overflow-hidden w-[25rem] md:w-[50rem] absolute top-[50%] translate-y-[-50%] left-[50%] translate-x-[-50%] shadow-md rounded-3xl mt-4 flex flex-col justify-center items-center">
        <div className="h-[50%] bg-[#00000046] glass w-full p-14 flex flex-col gap-20 justify-center items-center">
          {status == "authenticated" ? (
            <div className=" flex flex-col gap-6 justify-center items-center">
              <p
                style={{ fontFamily: " 'Cinzel Variable', serif" }}
                className="text-3xl md:text-4xl text-center tracking-wider font-medium text-white  font-gradient"
              >
                {finish ? "Your document is ready!" : "We're working on it"}
              </p>
              {srsTitle && (
                <p className="text-lg md:text-xl text-center tracking-wider font-medium text-blue-300">
                  {srsTitle}
                </p>
              )}
              <p className="text-base md:text-xl grace text-center tracking-wider font-medium text-gray-300">
                {finish
                  ? "You can now view or download your SRS document"
                  : currentMessage}
              </p>
              <div className="time_line_container">
                <div
                  className="time_line"
                  style={{ width: `${progress}px` }}
                ></div>
              </div>
              <div className="flex justify-center items-center gap-10 md:gap-16">
                <div
                  className={`button3 ${
                    finish ? "" : "pointer-events-none opacity-20"
                  }`}
                >
                  <div className="button-layer3 "></div>
                  <button
                    onClick={handleView}
                    className="text-slate-900 bg-opacity-65 flex justify-center items-center gap-2 w-full py-3 rounded-xl font-semibold"
                  >
                    <VisibilityIcon />
                    <p>View</p>
                  </button>
                </div>
                <div
                  className={`button ${
                    finish ? "" : "pointer-events-none opacity-20"
                  }`}
                >
                  <div className="button-layer"></div>
                  <button
                    onClick={() => handleDownload('pdf')}
                    className="text-slate-200 bg-opacity-65 flex justify-center items-center gap-2 w-full py-3 rounded-xl font-semibold"
                  >
                    <DownloadIcon />
                    <p>PDF</p>
                  </button>
                </div>
                <div
                  className={`button ${
                    finish ? "" : "pointer-events-none opacity-20"
                  }`}
                >
                  <div className="button-layer"></div>
                  <button
                    onClick={() => handleDownload('word')}
                    className="text-slate-200 bg-opacity-65 flex justify-center items-center gap-2 w-full py-3 rounded-xl font-semibold"
                  >
                    <DownloadIcon />
                    <p>Word</p>
                  </button>
                </div>
              </div>
              <div
                className={`${
                  finish ? "flex" : "hidden"
                } justify-center items-center gap-3 pt-2`}
              >
                <p className="text-base md:text-lg grace text-center tracking-wider font-medium text-gray-300 -translate-y-1">
                  Rate the PDF
                </p>
                <Stars rating={rating} setRating={setRating} />
              </div>
              <div
                className={`${
                  finish ? "flex" : "hidden"
                } flex-col justify-center items-center gap-4`}
              >
                <p className="text-base md:text-lg grace tracking-wider font-medium text-gray-300">
                  What traits best describes the PDF generated
                </p>
                <div className="flex flex-wrap justify-center items-center gap-3">
                  <Praise
                    name="User-Friendly"
                    praises={praises}
                    setPraises={setPraises}
                  />
                  <Praise
                    name="Efficient"
                    praises={praises}
                    setPraises={setPraises}
                  />
                  <Praise
                    name="Reliable"
                    praises={praises}
                    setPraises={setPraises}
                  />
                  <Praise
                    name="Helpful"
                    praises={praises}
                    setPraises={setPraises}
                  />
                  <Praise
                    name="Innovative"
                    praises={praises}
                    setPraises={setPraises}
                  />
                  <Praise
                    name="Accurate"
                    praises={praises}
                    setPraises={setPraises}
                  />
                  <Praise
                    name="Secure"
                    praises={praises}
                    setPraises={setPraises}
                  />
                  <Praise
                    name="Customizable"
                    praises={praises}
                    setPraises={setPraises}
                  />
                  <Praise
                    name="Informative"
                    praises={praises}
                    setPraises={setPraises}
                  />
                  <Praise
                    name="Responsive"
                    praises={praises}
                    setPraises={setPraises}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center items-center py-10">
              <Image
                src={lockImage}
                height={100}
                alt="Lock"
                className="absolute top-5 z-30 shadow md:scale-150"
              />
              <div className={`button2 absolute z-30 top-10 shadow-2xl `}>
                <div className="button-layer2"></div>
                <Link href="/sign-in">
                  <button className="bg-black px-4 py-2  w-full text-xl  font-bold tracking-wide text-black uppercase poppins-regular">
                    Login
                  </button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default Page;
