"use client";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button"
import {Card,CardContent,CardDescription,CardHeader,CardTitle} from "@/components/ui/card"
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";
import { CheckedState } from "@radix-ui/react-checkbox";
import { createChunkDecoder } from "ai";
import { filter, join, trim } from "lodash";
import { Loader2 } from "lucide-react";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { FaFacebookF, FaTwitter, FaInstagram, FaLinkedinIn } from 'react-icons/fa';
import React from "react";
import { FiScissors } from 'react-icons/fi'; // Import the scissors icon from react-icons
import html2canvas from 'html2canvas';
import { storage } from '@/lib/firebase-config';
import { ref, getDownloadURL } from 'firebase/storage';

export default function Home() {
  const [zoomLevel, setZoomLevel] = useState(0.7);
  const handleZoomIn = () => {
    setZoomLevel(zoomLevel + 0.1);
  };
  
  const handleZoomOut = () => {
    setZoomLevel(zoomLevel - 0.1);
  };
  const [selectedText, setSelectedText] = useState("");
  const [showAnimation, setShowAnimation] = useState(true);
  const [explainLoading, setExplainLoading] = useState<"eli5"|"summary"|"poem"|"UPSC"|null>(null);
  const [explainCompletion, setExplainCompletion] = useState("");
  const [currentExplainAction, setCurrentExplainAction] = useState<"eli5"|"summary"|"poem"|"UPSC"|null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [language, setLanguage] = useState("Arabic")
  const [translateLoading, setTranslateLoading] = useState(false);
  const [translation, setTranslation] = useState("");
  const [translationTTSLoading, setTranslationTTSLoading] = useState(false);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [ttsMode, setTtsMode] = useState(false);
  const [describeImageIdxLoading, setDescribeImageIdxLoading] = useState(-1);
  const [describeImageText, setDescribeImageText] = useState("");
  const sectionIdxRef = useRef(0);
  const textbookRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLVideoElement>(null);
  const asyncIdRef = useRef<number|null>(null);
  const { dismiss, toast } = useToast();
  const [isSnipMeAvailable, setIsSnipMeAvailable] = useState(false);
  const [additionalInfo, setAdditionalInfo] = useState('');


  const clearDocument = () => {
    // Clear existing highlights
    const existingHighlights = Array.from(document.getElementsByClassName("highlight-wrapper"));
    for (let i = 0; i < existingHighlights.length; i++) {
      existingHighlights[i].replaceWith(...Array.from(existingHighlights[i].childNodes))
    }

    setExplainCompletion("");
    setCurrentExplainAction(null);
    setTranslation("");
    setDescribeImageText("");
    asyncIdRef.current = null;
    playerRef.current!.pause();
  }
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowAnimation(false);
    }, 3000); // Total animation duration + fade-out

    return () => clearTimeout(timer);
  }, []);

  const handleExplainAction = useCallback(async (action: "eli5"|"summary"|"poem"|"UPSC") => {
    setExplainLoading(action);
    setCurrentExplainAction(action);
    setExplainCompletion("");
    const resp = await fetch("/api/explain", {
      method: "POST",
      body: JSON.stringify({
        action,
        text: selectedText
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (resp.body) {
      const reader = resp.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        const decoder = createChunkDecoder();
        setExplainCompletion((prevCompletion) => prevCompletion + decoder(value));
      }
    }

    setExplainLoading(null);
  }, [selectedText]);

  const handleTranslate = useCallback(async () => {
    setTranslateLoading(true);
    const resp = await fetch("/api/translate", {
      method: "POST",
      body: JSON.stringify({
        language,
        text: selectedText
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    let completion = "";

    if (resp.body) {
      const reader = resp.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        const decoder = createChunkDecoder();
        const decoded = decoder(value);
        completion += decoded
        setTranslation((prevCompletion) => prevCompletion + decoded);
      }
    }
    setTranslateLoading(false);

    return completion;
  }, [language, selectedText]);


  const getTTSResp = async (text: string) => {
    const resp = await fetch("/api/tts", {
      method: "POST",
      body: JSON.stringify({
        text,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    return resp;
  }

  const tts = useCallback(async (text: string, asyncId: number) => {
    if (asyncIdRef.current !== asyncId) return;

    const resp = await getTTSResp(text);

    if (resp.body) {  
      const reader = resp.body.getReader();

      const player = playerRef.current!;
      const mediaSource = new MediaSource();
      player.src = window.URL.createObjectURL(mediaSource);

      mediaSource.addEventListener("sourceopen", async () => {
        const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
        player.play();

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          try {
            sourceBuffer.appendBuffer(value);
          } catch (_e) {
            // Ok with this failing 
          }
        }
      });
    }
  }, []);

  const handleReadTranslation = useCallback(async () => {
    setTranslationTTSLoading(true);
    let existingTranslation = translation;
    if (!existingTranslation) {
      existingTranslation = await handleTranslate();
    }
    asyncIdRef.current = Date.now()
    await tts(existingTranslation, asyncIdRef.current)
    setTranslationTTSLoading(false)
  }, [translation, handleTranslate, tts]);

  const handleLanguageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLanguage(e.target.value);
  }

  const handleTtsModeChange = (checked: CheckedState) => {
    setTtsMode(checked as boolean)

    if (!checked) {
      const textbookContentElement = textbookRef.current;
      const children = Array.from(textbookContentElement?.children || []) as HTMLElement[];
      
      const nextSectionId = sectionIdxRef.current;
      children[nextSectionId - 1 === -1 ? children.length -1 : nextSectionId - 1].classList.remove("tts-highlight")
      sectionIdxRef.current = 0;
    } else {
      clearDocument();
    }
  }

  const describeImage = async (src: string, asyncId: number, additionalInfo: string) => {
    setDescribeImageText("");
  
    if (asyncIdRef.current !== asyncId) return;
  
    // Use the image source directly without converting to Data URL
    const imgURL = src;
  
    console.log(imgURL);
    const resp = await fetch("/api/vision", {
      method: "POST",
      body: JSON.stringify({
        image64: imgURL,
        additionalInfo: additionalInfo, // Add additionalInfo to the request body
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
  
    let completion = "";
    if (resp.body) {
      const reader = resp.body.getReader();
      while (true) {
        if (asyncIdRef.current !== asyncId) {
          setDescribeImageText("");
          return;
        }
  
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
  
        const decoder = createChunkDecoder();
        const decoded = decoder(value);
        completion += decoded;
        setDescribeImageText((prevCompletion) => prevCompletion + decoded);
      }
    }
  
    return completion;
  };
  

  // const handleDescribeImageFromIdx = async (idx: number) => {
  //   clearDocument();

  //   setDescribeImageIdxLoading(idx);

  //   const imageElements = document.getElementsByTagName("img");
  //   const img = imageElements[idx];
  //   if (img) {
  //     asyncIdRef.current = Date.now();
  //     const description = await describeImage(img.src, asyncIdRef.current)

  //     if (description) {
  //       asyncIdRef.current = Date.now();
  //       await tts(description, asyncIdRef.current);
  //     }

  //   }
  //   setDescribeImageIdxLoading(-1);
  // }

  const handleDescribeImage = async (additionalInfo: string) => {
    clearDocument();
  
    setDescribeImageIdxLoading(0);
  
    // Create a reference to the image in Firebase Storage
    const imgRef = ref(storage, 'snip_me.png');
    const imgSrc = await getDownloadURL(imgRef);
    asyncIdRef.current = Date.now();
    const description = await describeImage(imgSrc, asyncIdRef.current, additionalInfo);
  
    if (description) {
      asyncIdRef.current = Date.now();
      await tts(description, asyncIdRef.current);
    }
  
    setDescribeImageIdxLoading(1);
  };
  

  useEffect(() => {
    const textbookContentElement = textbookRef.current;
    const children = Array.from(textbookContentElement?.children || []) as HTMLElement[];

    const handleTabPress = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !children?.length) return;
      
      e.preventDefault();

      const nextSectionId = sectionIdxRef.current;
      children[nextSectionId - 1 === -1 ? children.length -1 : nextSectionId - 1].classList.remove("tts-highlight")
      children[nextSectionId].classList.add("tts-highlight");
      children[nextSectionId].scrollIntoView();

      playerRef.current!.pause();
      asyncIdRef.current = null;
      setSelectedText("");

      if (children[nextSectionId].tagName === "IMG") {
        asyncIdRef.current = Date.now();
        children[nextSectionId].classList.add("animate-pulse");
        describeImage((children[nextSectionId] as HTMLImageElement).src, asyncIdRef.current,additionalInfo).then((text) => {
          children[nextSectionId].classList.remove("animate-pulse");
          if (text) {
            asyncIdRef.current = Date.now();
            tts(text, asyncIdRef.current);
          }
        });
      } else {
        if (children[nextSectionId].textContent) {
          setSelectedText(children[nextSectionId].textContent!);

          asyncIdRef.current = Date.now()
          tts(children[nextSectionId].textContent!,  asyncIdRef.current);
        }
      }
      
      sectionIdxRef.current = (nextSectionId + 1) % children.length;
    }

    if (ttsMode) {
      clearDocument();
      document.addEventListener("keydown", handleTabPress)
    } else {
      clearDocument();
    }

    return () => {
      document.removeEventListener("keydown", handleTabPress)
    }
  }, [ttsMode, tts])

  useEffect(() => {
    const handlePlay = () => {
      toast({
        description: <div className="flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Reading out loud...</div>,
        action: <ToastAction altText="Stop" onClick={clearDocument}>Stop</ToastAction>,
      })
    }

    const handlePause = () => {
      dismiss();
    }
 
    playerRef.current?.addEventListener("play", handlePlay);
    playerRef.current?.addEventListener("pause", handlePause);

    return () => {
      playerRef.current?.removeEventListener("play", handlePlay);
      playerRef.current?.removeEventListener("pause", handlePause);
    }
  }, [])

  useEffect(() => {
    const highlightRange = (range: Range) => {
      const selectedWrapper = document.createElement("span");
      selectedWrapper.classList.add("bg-yellow-400", "highlight-wrapper");
      selectedWrapper.appendChild(range.extractContents());
      range.insertNode(selectedWrapper);
    }

    const handleMouseUp = () => {
    
      if (ttsMode) return;
    
      const textbookNode = textbookRef.current;
      //textbookNode);
      
      const selection = document.getSelection();
    
      if (!selection?.anchorNode) {
        //("No anchorNode found in selection");
        return;
      }
      if (!textbookNode?.contains(selection?.anchorNode)) {
        //("Selection is not within the textbookNode");
        return;
      }
      
      clearDocument();
    
      // Assuming clearDocument() clears the selection, 
      // you would want to log the selected text before clearing it.
      const selectedText = selection.toString().trim();
      //("Selected text: ", selectedText);

      if (selection) {
        // Get nodes to highlight
        const initialRange = selection.getRangeAt(0)
        //("Initial range: ", initialRange);
        const ancestor = initialRange.commonAncestorContainer;
        //("Common ancestor container: ", ancestor);
        const ranges = [];

        const startNodes = [];
        if (initialRange.startContainer !== ancestor) {
          for (let node = initialRange.startContainer; node !== ancestor && node.parentNode !== null; node = node.parentNode) {
            startNodes.push(node);
          }
        }
        //("Start nodes: ", startNodes);

        if (startNodes.length > 0) {
          for (let i = 0; i < startNodes.length; i++) {
            const range = document.createRange();
            if (i) {
              range.setStartAfter(startNodes[i - 1]);
              range.setEndAfter(startNodes[i].lastChild!);
            } else {
              range.setStart(startNodes[i], initialRange.startOffset);
              range.setEndAfter(
                (startNodes[i].nodeType == Node.TEXT_NODE) ?
                startNodes[i] :
                startNodes[i].lastChild!
              );
            }
            ranges.push(range);
          }
        }

        const endNodes = [];
        const re = [];
        if (initialRange.endContainer !== ancestor) {
          for (let node = initialRange.endContainer; node !== ancestor && node.parentNode !== null; node = node.parentNode) {
            endNodes.push(node);
          }
        }
        //("End nodes: ", endNodes);
        if (endNodes.length > 0) {
          for (let i = 0; i < endNodes.length; i++) {
            const range = document.createRange();
            if (i) {
              range.setStartBefore(endNodes[i].firstChild!);
              range.setEndBefore(endNodes[i - 1]);
            }
            else {
              range.setEnd(endNodes[i], initialRange.endOffset);
              range.setStartBefore(
                (endNodes[i].nodeType == Node.TEXT_NODE) ?
                endNodes[i] :
                endNodes[i].firstChild!
              );
            }
            re.unshift(range);
          }
        }

        let finalRanges = [];
        if ((startNodes.length > 0) && (endNodes.length > 0)) {
          const range = document.createRange();
          range.setStartAfter(startNodes[startNodes.length - 1]);
          range.setEndBefore(endNodes[endNodes.length - 1]);
          ranges.push(range);
          finalRanges = ranges.concat(re)
        } else {
          finalRanges = [initialRange]
        }
        //("Final ranges: ", finalRanges);

        const filteredRanges = filter(finalRanges, (range) => {
          return textbookNode.contains(range.startContainer);
        })

        for (let i = 0; i < filteredRanges.length; i++) {
          
          highlightRange(filteredRanges[i]);
        }
        //("Filtered ranges: ", filteredRanges);

        const text = join(filteredRanges.map((range) => range.toString()), "\n");
        setSelectedText(trim(text));
        //("Concatenated text: ", text);

        selection.removeAllRanges();
      } else {
        setSelectedText("");
      }
    }
    
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
    }
  }, [ttsMode]);


  const removeHighlights = (iframeDocument: Document) => {
    const highlightedElements = iframeDocument.querySelectorAll("span.highlighted");
    highlightedElements.forEach((element: Element) => {
      const parent = element.parentNode;
      if (parent) {
        while (element.firstChild) {
          parent.insertBefore(element.firstChild, element);
        }
        parent.removeChild(element);
      }
    });
  };
  

  useEffect(() => {
    const highlightRange = (range : Range) => {
      const selectedWrapper = document.createElement("span");
      selectedWrapper.className = "highlighted"; // Add this line
      selectedWrapper.style.backgroundColor = "rgba(255, 255, 0, 0.5)"; // Use your desired highlight color
      selectedWrapper.appendChild(range.extractContents());
      range.insertNode(selectedWrapper);
    }
  
    const handleMouseUp = () => {
      const iframeDocument = iframeRef.current?.contentWindow?.document;
  
      if (!iframeDocument) return;
      removeHighlights(iframeDocument);

      const selection = iframeDocument.getSelection();
      
      if (!selection || selection.rangeCount === 0) return;
      //('Selection object:', selection);

      const initialRange = selection.getRangeAt(0);
      const ancestor = initialRange.commonAncestorContainer;
      const ranges = [];
  
      // Process start nodes
      const startNodes = [];
      if (initialRange.startContainer !== ancestor) {
        for (let node = initialRange.startContainer; node !== ancestor && node.parentNode !== null; node = node.parentNode) {
          startNodes.push(node);
        }
      }
  
      if (startNodes.length > 0) {
        for (let i = 0; i < startNodes.length; i++) {
          const range = iframeDocument.createRange();
          if (i) {
            range.setStartAfter(startNodes[i - 1]);
            range.setEndAfter(startNodes[i].lastChild || startNodes[i]);
          } else {
            range.setStart(startNodes[i], initialRange.startOffset);
            range.setEndAfter(startNodes[i].lastChild || startNodes[i]);
          }
          ranges.push(range);
        }
      }
  
      // Process end nodes
      const endNodes = [];
      if (initialRange.endContainer !== ancestor) {
        for (let node = initialRange.endContainer; node !== ancestor && node.parentNode !== null; node = node.parentNode) {
          endNodes.push(node);
        }
      }
  
      if (endNodes.length > 0) {
        for (let i = 0; i < endNodes.length; i++) {
          const range = iframeDocument.createRange();
          if (i) {
            range.setStartBefore(endNodes[i].firstChild || endNodes[i]);
            range.setEndBefore(endNodes[i - 1]);
          } else {
            range.setEnd(endNodes[i], initialRange.endOffset);
            range.setStartBefore(endNodes[i].firstChild || endNodes[i]);
          }
          ranges.unshift(range);
        }
      }
  
      // Merge ranges
      let finalRanges = [];
      if (startNodes.length > 0 && endNodes.length > 0) {
        const range = iframeDocument.createRange();
        range.setStartAfter(startNodes[startNodes.length - 1]);
        range.setEndBefore(endNodes[endNodes.length - 1]);
        ranges.push(range);
        finalRanges = ranges;
      } else {
        finalRanges = [initialRange];
      }
  
      // Highlight ranges
      finalRanges.forEach((range) => highlightRange(range));
  
      // Update selected text state
      const selectedText = finalRanges.map((range) => range.toString()).join("\n");
      setSelectedText(selectedText);
  
      // Remove the selection
      selection.removeAllRanges();
    };
  
    // Add the event listener to the document inside the iframe
    const iframeDocument = iframeRef.current?.contentWindow?.document;
    iframeDocument?.addEventListener("mouseup", handleMouseUp);
  
    return () => {
      iframeDocument?.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);
  
  const handleProfilePicChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        setProfilePic(e.target?.result as string);
      };
      reader.readAsDataURL(event.target.files[0]);
    }
  };

  const handleTakeScreenshot = async () => {
    // Check if the iframe content is accessible
    const iframe = document.querySelector('iframe');
    if (iframe && iframe.contentWindow && iframe.contentDocument) {
      // Attempt to capture the visible content of the iframe
      html2canvas(iframe.contentDocument.body, {
        scale: 1, // Use the current zoom level (1x)
      }).then(async (canvas) => {
        const image = canvas.toDataURL('image/png');
  
        // Send the image to the backend
        const response = await fetch('/api/save-snip', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ image }),
        });
  
        const data = await response.json();
        console.log(data.message); // Log the response message
      }).catch(error => {
        console.error('Error capturing iframe content:', error);
      });
    } else {
      // Fallback or error handling if the iframe content is not accessible
      console.error('Unable to access iframe contents or iframe is from a different origin.');
    }
  };
  
  

  useEffect(() => {
    // Function to check if the 'snip_me.png' file exists on the server
    const checkForSnipMeFile = async () => {
      try {
        const response = await fetch('/api/check-snip-existence');
        const data = await response.json();
        setIsSnipMeAvailable(data.exists); // Set the state based on the existence of the file
      } catch (error) {
        setIsSnipMeAvailable(false); // If there is an error, assume the file does not exist
      }
    };
  
    const deleteSnipMeFile = async () => {
      try {
        const response = await fetch('/api/delete-snip', { method: 'DELETE' });
        const data = await response.json();
      } catch (error) {
      
      }
    };

    // Set up the interval to check for the file's existence
    const intervalId = setInterval(() => {
      checkForSnipMeFile();
    }, 1000); // Check every 1000 milliseconds (1 second)
  

    const deleteIntervalId = setInterval(() => {
      deleteSnipMeFile();
    }, 300000); // Delete every 120000 milliseconds (2 minutes)

    
    // Clear the interval when the component is unmounted
    return () => {
      clearInterval(intervalId);
      clearInterval(deleteIntervalId);
    };
  }, []);
  

  return (
    <>
      {showAnimation && (
        <div className="full-screen-animation fade-out">
          <h1 className="message">Welcome To Reader AI</h1>
          <h2 className="sub-message">Revolutionize Your Reading With AI</h2>
        </div>
      )}
       <header className="bg-black py-2 px-8 flex items-center justify-between border-b border-gray-700">
  <div className="flex items-center">
  <img src="./logo.png" alt="Logo" className="text-2xl mr-2 w-64 h-18" />
    <nav className="ml-9">
      <ul className="flex space-x-8">
        <li><a href="#" className="text-gray-200 hover:text-gray-300">Home</a></li>
        <li><a href="#" className="text-gray-200 hover:text-gray-300">Features</a></li>
        <li><a href="#" className="text-gray-200 hover:text-gray-300">Pricing</a></li>
        <li><a href="#" className="text-gray-200 hover:text-gray-300">About Us</a></li>
      </ul>
    </nav>
  </div>
  <div className="flex items-center">
    <button className="mr-4 px-6 py-2 rounded-full text-black bg-white focus:outline-none focus:shadow-outline box-shadow border border-gray-300 transition transform hover:bg-gray-300 hover:text-white hover:scale-105" type="button">
      Sign Up
    </button>
    <button className="px-6 py-2 rounded-full text-black bg-white focus:outline-none focus:shadow-outline box-shadow border border-gray-300 transition transform hover:bg-gray-300 hover:text-white hover:scale-105" type="button">
      Log In
    </button>
    <label className="ml-4">
      <input type="file" accept="image/jpeg" onChange={handleProfilePicChange} style={{ display: 'none' }} />
      <img src={profilePic || './me.jpg'} alt="Profile" className="w-10 h-10 rounded-full cursor-pointer" />
    </label>
  </div>
</header>
      <main className={`${showAnimation ? 'hidden' : 'block'}`}>
      <video ref={playerRef} className="hidden"/>      
      <div className="flex items-start justify-between space-x-12 ">
      <div className="text-center px-4 py-8 sm:px-6 lg:px-8">
      <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800" >Elevate Your Experience with AI</h2>

      <div className="relative w-full max-w-5xl mt-8"> 
    {/* Container for zoom buttons */}
    <div className="zoom-controls absolute top-0 right-0 mt-2 mr-2">
      <button onClick={handleZoomIn} className="p-1 bg-gray-200">+</button>
      <button onClick={handleZoomOut} className="p-1 bg-gray-200">-</button>
    </div>

    <div className="iframe-container">
      <iframe
        ref={iframeRef}
        src="/sample.html"
        title="Biology Iframe"
        className="iframe-content"
        style={{ transform: `scale(${zoomLevel})` }}
      />
    </div>
  </div>      
 
    </div>
    <div className="w-1/2 h-screen overflow-y-scroll hide-scrollbar pr-4 py-10 space-y-4">
    <Card style={{ width: '500px' }}>
            <CardHeader>
              <CardTitle>Explain</CardTitle>
              <CardDescription>Guiding learners through content</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-1">
                <Button variant={currentExplainAction === "eli5" ? "default" : "outline"} disabled={!!explainLoading || !selectedText} onClick={() => handleExplainAction("eli5")}>
                  {explainLoading === "eli5" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  ELI5
                </Button> 
                <Button variant={currentExplainAction === "summary" ? "default" : "outline"} disabled={!!explainLoading || !selectedText} onClick={() => handleExplainAction("summary")}>
                  {explainLoading === "summary" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Summarize
                </Button>
                <Button variant={currentExplainAction === "poem" ? "default" : "outline"} disabled={!!explainLoading || !selectedText} onClick={() => handleExplainAction("poem")}>
                  {explainLoading === "poem" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Poem
                </Button>
                {/* <Button variant={currentExplainAction === "UPSC" ? "default" : "outline"} disabled={!!explainLoading || !selectedText} onClick={() => handleExplainAction("UPSC")}>
                  {explainLoading === "UPSC" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  UPSC Assistant
                </Button> */}
              </div>
              {(explainCompletion || !selectedText) && <div className="w-full text-sm mt-4">
                {explainCompletion && <pre className="whitespace-pre-line">{explainCompletion}</pre>}
                {!selectedText && <span className="italic text-gray-300">👈 Highlight textbook text to perform actions </span>}
              </div>}
            </CardContent>
          </Card>
          <Card style={{ width: '500px' }}>
            <CardHeader>
              <CardTitle>Translation</CardTitle>
              <CardDescription>Foreign language assistance</CardDescription>
            </CardHeader>
            <CardContent>
              <Input style={{ width: '200px' }} placeholder="e.g. Japanese" value={language} onChange={handleLanguageInputChange}/>
              <div className="flex items-center space-x-1 mt-4">
                <Button  variant="outline" disabled={!!translateLoading || translationTTSLoading || !selectedText || !language} onClick={handleTranslate}>
                  {translateLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Translate to {language ? language : "_______"}
                </Button>
                <Button variant="outline" disabled={!!translateLoading || translationTTSLoading || !selectedText || !language} onClick={handleReadTranslation}>
                  {translationTTSLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Read out loud
                </Button>
              </div>
              {(translation || !selectedText) && <div className="w-full text-sm mt-4">
                {translation && <pre className="whitespace-pre-line">{translation}</pre>}
                {!selectedText && <span className="italic text-gray-300">👈 Highlight textbook text to translate</span>}
              </div>}
            </CardContent>
          </Card>
          
          <Card style={{ width: '500px' }}>
          <CardHeader>
            <div className="flex items-center ">
              <div>
                <CardTitle>Vision</CardTitle>
              </div>
              <div>
                <button onClick={handleTakeScreenshot} className="p-2 rounded hover:bg-gray-200">
                  <FiScissors size={20} />
                </button>
              </div>
            </div>
          </CardHeader>
            <CardContent>
              {/* <div className="mb-4 mt-1">
                <div className="flex items-center space-x-2 cursor-pointer">
                  <Switch id="tts-mode" checked={ttsMode} onCheckedChange={handleTtsModeChange} />
                  <Label htmlFor="tts-mode">TTS Mode</Label>
                </div>
                {ttsMode && <div className="text-sm italic mt-2">Press <span className="border rounded bg-gray-100 px-1 ">Tab</span> to read sections of the textbook out loud and describe images.</div>}
              </div> */}

              <hr/>
              <div className="text-sm font-medium mb-2 mt-4">Describe Images Using AI</div>
              <div className="flex items-center space-x-1">
                {/* <Button variant="outline" disabled={describeImageIdxLoading !== -1} onClick={() => handleDescribeImageFromIdx(0)}>
                  {describeImageIdxLoading === 0 && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Describe Image
                </Button> */}

                <div className="flex items-center space-x-2">
                  <Input
                    style={{ width: '200px' }}
                    placeholder="Add Info"
                    disabled={!isSnipMeAvailable}
                    value={additionalInfo}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    disabled={!isSnipMeAvailable}
                    onClick={() => handleDescribeImage(additionalInfo)}
                  >
                    {describeImageIdxLoading === 0 && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Describe
                  </Button>
                </div>
                {!isSnipMeAvailable && <span className="italic text-gray-300">👈Click on Scissors </span>}
                {/* <Button variant="outline" disabled={describeImageIdxLoading !== -1} onClick={() => handleDescribeImageFromIdx(1)}>
                  {describeImageIdxLoading === 1 && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Describe Image 2
                </Button> */}
                {/* <Button variant="outline" disabled={describeImageIdxLoading !== -1} onClick={() => handleDescribeImageFromIdx(2)}>
                  {describeImageIdxLoading === 2 && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Describe Image 3
                </Button> */}
              </div>
              {describeImageText && <Accordion type="single" collapsible defaultValue="img-description">
                <AccordionItem value="img-description" className="border-none">
                  <AccordionTrigger className="text-xs pt-4 text-gray-600">Image description</AccordionTrigger>
                  <AccordionContent>
                    <pre className="w-full text-xs mt-4 whitespace-pre-line">{describeImageText}</pre>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
    <footer className="bg-black text-white p-4">
            <div className="container mx-auto">
                <div className="flex justify-between items-center">
                    <div className="w-1/4">
                    <img src="./logo.png" alt="Logo" className="text-2xl w-64 h-18" />
                        <p className="mt-2">Elevate your experience with AI</p>
                    </div>
                    <div className="w-1/4">
                        <h3 className="font-bold">Quick Links</h3>
                        <ul className="mt-2 space-y-2">
                            <li><a href="/home" className="hover:underline">Home</a></li>
                            <li><a href="/features" className="hover:underline">Features</a></li>
                            <li><a href="/pricing" className="hover:underline">Pricing</a></li>
                            <li><a href="/about" className="hover:underline">About Us</a></li>
                        </ul>
                    </div>
                    <div className="w-1/4">
                        <h3 className="font-bold">Contact Us</h3>
                        <p className="mt-2">Email: knowme@readerai.com</p>
                        <p>Phone: +91 9841365892</p>
                        <p>Address: 123, Park Street, Kolkata, India</p>
                    </div>
                    <div className="w-1/4">
                        <h3 className="font-bold">Follow Us</h3>
                        <div className="mt-2 flex space-x-4">
                        <a href="/facebook" className="hover:text-gray-400"><FaFacebookF /></a>
                        <a href="/twitter" className="hover:text-gray-400"><FaTwitter /></a>
                        <a href="/instagram" className="hover:text-gray-400"><FaInstagram /></a>
                        <a href="/linkedin" className="hover:text-gray-400"><FaLinkedinIn /></a>
                    </div>
                    </div>
                </div>
                <hr className="my-4 border-gray-600"/>
                <p className="text-center">© 2024 Reader AI, All rights reserved</p>
            </div>
        </footer>
    </>
  )
}
