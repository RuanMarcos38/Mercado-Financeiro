"use client";

import { useEffect,useRef } from "react";
import type { Candle } from "@/lib/market/types";

export default function LiveCandleChart({candles}:{candles:Candle[]}){
  const ref=useRef<HTMLDivElement|null>(null);

  useEffect(()=>{
    if(!ref.current||!candles.length)return;

    let chart:any;
    let disposed=false;

    (async()=>{
      const lib=await import("lightweight-charts");
      if(disposed||!ref.current)return;

      chart=lib.createChart(ref.current,{
        width:ref.current.clientWidth,
        height:420,
        layout:{background:{type:lib.ColorType.Solid,color:"#ffffff"},textColor:"#65758b"},
        grid:{vertLines:{color:"#eef2f7"},horzLines:{color:"#eef2f7"}},
        rightPriceScale:{borderColor:"#e4e9f1"},
        timeScale:{borderColor:"#e4e9f1",timeVisible:true,secondsVisible:false},
        crosshair:{mode:lib.CrosshairMode.Normal}
      });

      const series=chart.addSeries(lib.CandlestickSeries,{
        upColor:"#1ca678",downColor:"#e85964",
        borderUpColor:"#1ca678",borderDownColor:"#e85964",
        wickUpColor:"#1ca678",wickDownColor:"#e85964"
      });

      series.setData(candles.map(c=>({
        time:Math.floor(new Date(c.time).getTime()/1000) as any,
        open:c.open,high:c.high,low:c.low,close:c.close
      })));

      chart.timeScale().fitContent();

      const ro=new ResizeObserver(()=>{
        if(ref.current&&chart)chart.applyOptions({width:ref.current.clientWidth});
      });
      ro.observe(ref.current);
      (chart as any).__ro=ro;
    })();

    return ()=>{
      disposed=true;
      if(chart){
        chart.__ro?.disconnect?.();
        chart.remove();
      }
    };
  },[candles]);

  return <div ref={ref} className="liveCandleChart"/>;
}
