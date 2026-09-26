"use client";

import { useEffect,useRef } from "react";
import type { Candle } from "@/lib/market/types";

type SignalOverlay={
  side?:"BUY"|"SELL";
  status?:string;
  entry?:number;
  stopLoss?:number;
  takeProfit?:number;
  preAlert?:boolean;
};

export default function LiveCandleChart({candles,signal}:{candles:Candle[];signal?:SignalOverlay|null}){
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

      const data=candles.map(c=>({
        time:Math.floor(new Date(c.time).getTime()/1000) as any,
        open:c.open,high:c.high,low:c.low,close:c.close
      }));
      series.setData(data);

      if(signal?.entry&&Number.isFinite(signal.entry)){
        series.createPriceLine({
          price:signal.entry,
          color:signal.side==="BUY"?"#168c66":"#d74b58",
          lineWidth:2,lineStyle:2,axisLabelVisible:true,
          title:signal.preAlert?"PRÉ-ENTRADA":"ENTRADA"
        });
      }
      if(signal?.stopLoss&&Number.isFinite(signal.stopLoss)){
        series.createPriceLine({price:signal.stopLoss,color:"#d74b58",lineWidth:1,lineStyle:2,axisLabelVisible:true,title:"STOP"});
      }
      if(signal?.takeProfit&&Number.isFinite(signal.takeProfit)){
        series.createPriceLine({price:signal.takeProfit,color:"#168c66",lineWidth:1,lineStyle:2,axisLabelVisible:true,title:"ALVO"});
      }

      const last=data.at(-1);
      const createMarkers=(lib as any).createSeriesMarkers;
      if(last&&signal?.side&&createMarkers){
        createMarkers(series,[{
          time:last.time,
          position:signal.side==="BUY"?"belowBar":"aboveBar",
          color:signal.side==="BUY"?"#168c66":"#d74b58",
          shape:signal.side==="BUY"?"arrowUp":"arrowDown",
          text:(signal.preAlert?"PRÉ ":"")+(signal.side==="BUY"?"COMPRA":"VENDA")
        }]);
      }

      chart.timeScale().fitContent();

      const ro=new ResizeObserver(()=>{
        if(ref.current&&chart)chart.applyOptions({width:ref.current.clientWidth});
      });
      ro.observe(ref.current);
      (chart as any).__ro=ro;
    })();

    return ()=>{
      disposed=true;
      if(chart){chart.__ro?.disconnect?.();chart.remove();}
    };
  },[candles,signal?.side,signal?.status,signal?.entry,signal?.stopLoss,signal?.takeProfit,signal?.preAlert]);

  return <div ref={ref} className="liveCandleChart"/>;
}
