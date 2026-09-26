"use client";

import { useEffect,useRef,useState } from "react";
import { Crosshair,Grid3X3,Layers3,LocateFixed,Maximize2,ZoomIn,ZoomOut } from "lucide-react";
import type { Candle } from "@/lib/market/types";

type SignalOverlay={
  side?:"BUY"|"SELL";
  status?:string;
  entry?:number;
  stopLoss?:number;
  takeProfit?:number;
  preAlert?:boolean;
};

type HoverCandle={
  time:string;
  open:number;
  high:number;
  low:number;
  close:number;
}|null;

export default function LiveCandleChart({candles,signal}:{candles:Candle[];signal?:SignalOverlay|null}){
  const hostRef=useRef<HTMLDivElement|null>(null);
  const chartRef=useRef<any>(null);
  const seriesRef=useRef<any>(null);
  const libRef=useRef<any>(null);
  const priceLinesRef=useRef<any[]>([]);
  const fittedRef=useRef(false);
  const [hover,setHover]=useState<HoverCandle>(null);
  const [levelsVisible,setLevelsVisible]=useState(true);
  const [gridVisible,setGridVisible]=useState(true);
  const [autoScale,setAutoScale]=useState(true);

  function zoom(factor:number){
    const chart=chartRef.current;
    if(!chart)return;
    const ts=chart.timeScale();
    const range=ts.getVisibleLogicalRange?.();
    if(!range)return;
    const center=(range.from+range.to)/2;
    const half=((range.to-range.from)/2)*factor;
    ts.setVisibleLogicalRange({from:center-half,to:center+half});
  }

  function fit(){
    const chart=chartRef.current;
    if(!chart)return;
    chart.timeScale().fitContent();
    chart.priceScale("right").applyOptions({autoScale:true});
    setAutoScale(true);
  }

  function goRealtime(){
    chartRef.current?.timeScale().scrollToRealTime?.();
  }

  function toggleAutoScale(){
    const next=!autoScale;
    chartRef.current?.priceScale("right").applyOptions({autoScale:next});
    setAutoScale(next);
  }

  function toggleGrid(){
    const next=!gridVisible;
    chartRef.current?.applyOptions({
      grid:{
        vertLines:{visible:next,color:"#eef2f7"},
        horzLines:{visible:next,color:"#eef2f7"}
      }
    });
    setGridVisible(next);
  }

  useEffect(()=>{
    if(!hostRef.current)return;
    let disposed=false;
    let ro:ResizeObserver|undefined;

    (async()=>{
      const lib=await import("lightweight-charts");
      if(disposed||!hostRef.current)return;
      libRef.current=lib;

      const responsiveHeight=(width:number)=>width<=520?300:width<=900?360:420;
      const chart=lib.createChart(hostRef.current,{
        width:hostRef.current.clientWidth,
        height:responsiveHeight(hostRef.current.clientWidth),
        layout:{background:{type:lib.ColorType.Solid,color:"#ffffff"},textColor:"#65758b"},
        grid:{
          vertLines:{color:"#eef2f7",visible:true},
          horzLines:{color:"#eef2f7",visible:true}
        },
        rightPriceScale:{
          borderColor:"#e4e9f1",
          autoScale:true,
          scaleMargins:{top:.08,bottom:.08}
        },
        timeScale:{
          borderColor:"#e4e9f1",
          timeVisible:true,
          secondsVisible:false,
          rightOffset:4,
          barSpacing:8,
          minBarSpacing:2,
          fixLeftEdge:false,
          fixRightEdge:false
        },
        crosshair:{
          mode:lib.CrosshairMode.Normal,
          vertLine:{labelVisible:true},
          horzLine:{labelVisible:true}
        },
        handleScroll:{
          mouseWheel:true,
          pressedMouseMove:true,
          horzTouchDrag:true,
          vertTouchDrag:false
        },
        handleScale:{
          axisPressedMouseMove:true,
          mouseWheel:true,
          pinch:true
        }
      });

      const series=chart.addSeries(lib.CandlestickSeries,{
        upColor:"#1ca678",downColor:"#e85964",
        borderUpColor:"#1ca678",borderDownColor:"#e85964",
        wickUpColor:"#1ca678",wickDownColor:"#e85964",
        priceLineVisible:true,
        lastValueVisible:true
      });

      chartRef.current=chart;
      seriesRef.current=series;

      chart.subscribeCrosshairMove((param:any)=>{
        if(!param?.time||!param?.seriesData)return setHover(null);
        const d=param.seriesData.get(series);
        if(!d||typeof d.open!=="number")return setHover(null);
        const unix=typeof param.time==="number"?param.time:null;
        setHover({
          time:unix?new Date(unix*1000).toLocaleString("pt-BR"):"",
          open:d.open,high:d.high,low:d.low,close:d.close
        });
      });

      ro=new ResizeObserver(()=>{
        if(hostRef.current&&chart){
          const width=hostRef.current.clientWidth;
          chart.applyOptions({width,height:responsiveHeight(width)});
        }
      });
      ro.observe(hostRef.current);
    })();

    return()=>{
      disposed=true;
      ro?.disconnect();
      chartRef.current?.remove?.();
      chartRef.current=null;
      seriesRef.current=null;
      libRef.current=null;
      fittedRef.current=false;
    };
  },[]);

  useEffect(()=>{
    const series=seriesRef.current;
    const chart=chartRef.current;
    if(!series||!chart||!candles.length)return;

    const data=candles.map(c=>({
      time:Math.floor(new Date(c.time).getTime()/1000) as any,
      open:c.open,high:c.high,low:c.low,close:c.close
    }));
    series.setData(data);

    if(!fittedRef.current){
      chart.timeScale().fitContent();
      fittedRef.current=true;
    }
  },[candles]);

  useEffect(()=>{
    const series=seriesRef.current;
    const lib=libRef.current;
    if(!series||!lib)return;

    for(const line of priceLinesRef.current){
      try{series.removePriceLine(line);}catch{}
    }
    priceLinesRef.current=[];

    if(levelsVisible){
      if(signal?.entry&&Number.isFinite(signal.entry)){
        priceLinesRef.current.push(series.createPriceLine({
          price:signal.entry,
          color:signal.side==="BUY"?"#168c66":"#d74b58",
          lineWidth:2,lineStyle:2,axisLabelVisible:true,
          title:signal.preAlert?"PRÉ-ENTRADA":"ENTRADA"
        }));
      }
      if(signal?.stopLoss&&Number.isFinite(signal.stopLoss)){
        priceLinesRef.current.push(series.createPriceLine({
          price:signal.stopLoss,color:"#d74b58",lineWidth:1,lineStyle:2,axisLabelVisible:true,title:"STOP"
        }));
      }
      if(signal?.takeProfit&&Number.isFinite(signal.takeProfit)){
        priceLinesRef.current.push(series.createPriceLine({
          price:signal.takeProfit,color:"#168c66",lineWidth:1,lineStyle:2,axisLabelVisible:true,title:"ALVO"
        }));
      }
    }

    const last=candles.at(-1);
    const createMarkers=(lib as any).createSeriesMarkers;
    if(createMarkers){
      const markers=last&&signal?.side?[{
        time:Math.floor(new Date(last.time).getTime()/1000) as any,
        position:signal.side==="BUY"?"belowBar":"aboveBar",
        color:signal.side==="BUY"?"#168c66":"#d74b58",
        shape:signal.side==="BUY"?"arrowUp":"arrowDown",
        text:(signal.preAlert?"PRÉ ":"")+(signal.side==="BUY"?"COMPRA":"VENDA")
      }]:[];
      createMarkers(series,markers);
    }
  },[candles,levelsVisible,signal?.side,signal?.status,signal?.entry,signal?.stopLoss,signal?.takeProfit,signal?.preAlert]);

  const last=candles.at(-1);
  const display=hover??(last?{
    time:new Date(last.time).toLocaleString("pt-BR"),
    open:last.open,high:last.high,low:last.low,close:last.close
  }:null);

  return <div className="liveChartShell">
    <div className="liveChartTools" aria-label="Ferramentas do gráfico">
      <div className="chartOhlc" aria-live="polite">
        {display&&<>
          <span>{display.time}</span>
          <b>O {display.open.toFixed(5)}</b>
          <b>H {display.high.toFixed(5)}</b>
          <b>L {display.low.toFixed(5)}</b>
          <b>C {display.close.toFixed(5)}</b>
        </>}
      </div>
      <div className="chartToolButtons">
        <button type="button" onClick={()=>zoom(.72)} title="Aumentar zoom"><ZoomIn size={14}/><span>+</span></button>
        <button type="button" onClick={()=>zoom(1.38)} title="Diminuir zoom"><ZoomOut size={14}/><span>−</span></button>
        <button type="button" onClick={fit} title="Ajustar gráfico"><Maximize2 size={14}/><span>Ajustar</span></button>
        <button type="button" onClick={goRealtime} title="Ir para o candle mais recente"><LocateFixed size={14}/><span>Agora</span></button>
        <button type="button" className={autoScale?"active":""} onClick={toggleAutoScale} title="Autoescala de preço"><Crosshair size={14}/><span>Auto</span></button>
        <button type="button" className={levelsVisible?"active":""} onClick={()=>setLevelsVisible(v=>!v)} title="Mostrar ou ocultar Entrada, Stop e Alvo"><Layers3 size={14}/><span>Níveis</span></button>
        <button type="button" className={gridVisible?"active":""} onClick={toggleGrid} title="Mostrar ou ocultar grade"><Grid3X3 size={14}/><span>Grade</span></button>
      </div>
    </div>
    <div ref={hostRef} className="liveCandleChart" aria-label="Gráfico de candles interativo"/>
  </div>;
}
