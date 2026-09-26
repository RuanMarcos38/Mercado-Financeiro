"use client";

import { useEffect } from "react";
import { Languages } from "lucide-react";

declare global{
  interface Window{
    google?:any;
    googleTranslateElementInit?:()=>void;
  }
}

export default function GlobalLanguageSelector(){
  useEffect(()=>{
    if(typeof window==="undefined")return;

    const init=()=>{
      if(!window.google?.translate?.TranslateElement)return;
      const host=document.getElementById("google_translate_element");
      if(!host||host.dataset.ready==="1")return;
      host.dataset.ready="1";
      new window.google.translate.TranslateElement({
        pageLanguage:"pt",
        autoDisplay:false,
        multilanguagePage:true
      },"google_translate_element");
    };

    window.googleTranslateElementInit=init;

    const existing=document.getElementById("google-translate-script");
    if(existing){
      init();
      return;
    }

    const script=document.createElement("script");
    script.id="google-translate-script";
    script.src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async=true;
    document.body.appendChild(script);

    return()=>{};
  },[]);

  return <div className="globalLanguage" title="Idioma da plataforma">
    <Languages size={14}/>
    <div id="google_translate_element"/>
  </div>;
}
