import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import './GeneralChart.css'


export const ProfitMargin = ({incomeInfo, h, w, update_color}) => {
  
  const [definition, setDefinition] = useState(true);
  const [definition2, setDefinition2] = useState(true);
  const [margins, setMargins] = useState(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [width2, setWidth2] = useState(0);
  const [height2, setHeight2] = useState(0);
  let maxValuegpm = useRef(0);
  let minValuegpm = useRef(0);
  let maxValuenpm = useRef(0);
  let minValuenpm = useRef(0);


  const padding = Math.min(Math.min(0.1 * width, 0.1 * height), 25);
  const padding2 = Math.min(Math.min(0.1 * width2, 0.1 * height2), 25);
  useEffect(() =>{
    if (definition == false) return;

    setHeight(Math.floor(svgRef.current.parentElement.offsetHeight));
    setWidth(Math.floor(svgRef.current.parentElement.offsetWidth));
  }, [h, w, definition]);
  useEffect(() => {
    if (definition2 == false) return;
    setHeight2(Math.floor(svgRef2.current.parentElement.offsetHeight));
    setWidth2(Math.floor(svgRef2.current.parentElement.offsetWidth));
  }, [h, w, definition2]);
  const svgRef = useRef();
  const svgRef2 = useRef();

  useEffect(() => {
    if (incomeInfo == null) {
      setMargins(null);
      return;
    }
    setMargins(incomeInfo['income_data'].map((entry) =>{
      var key = Object.keys(entry)[0];
      var values = Object.values(entry)[0];
      return {key: key, v : values.map(item => {
        var gross_profit = item['totalRevenue'] - item['costOfRevenue'];
        var gpm = 0;
        if (item['totalRevenue'] != 0) gpm = gross_profit / item['totalRevenue']; //divide by zero safety guard
        var npm = 0;
        if (item['totalRevenue'] != 0) npm = item['netIncome'] / item['totalRevenue']; //divide by zero safety guard
        maxValuegpm.current = Math.max(maxValuegpm.current, gpm);
        minValuegpm.current = Math.min(minValuegpm.current, gpm);
        
        maxValuenpm.current = Math.max(maxValuenpm.current, npm);
        minValuenpm.current = Math.min(minValuenpm.current, npm);
        return {'fiscalDateEnding' : item['fiscalDateEnding'], 'gpm' : gpm, 'npm': npm}
      })}
    }));
  }, [incomeInfo])

  //gross profit margin
  useEffect(() => {
      d3.select("#gpm").html("");
      if (margins == null || definition == false) return;
      const svg = d3.select(svgRef.current)
              .attr('width', width)
              .attr('height', height)
              .attr('padding', padding)
  
      const xScale = d3.scalePoint()
          .domain(incomeInfo['date'])
          .range([0+padding, width-padding]);

      const yScale = d3.scaleLinear()
          .domain([Math.floor(minValuegpm.current), Math.ceil(maxValuegpm.current)])
          .range([height-padding, 0+padding]);
  
      const xAxis = d3.axisBottom(xScale)
          .ticks(incomeInfo['date'].length)
          .tickSizeOuter(0);

      const yAxis = d3.axisLeft(yScale)
          .ticks(5);
  
      const drawgpm = d3.line()
        .x(function (d) {return xScale(d['fiscalDateEnding'])})
        .y(function (d) {return yScale(d['gpm'])});
  
      //gross profit margin
      //net profit margin
      svg.selectAll('.gpm')
      .data(margins)
      .join('path')
        .attr('class', 'line')
        .attr('fill', 'None')
        .attr('stroke', function(d) {return update_color(d.key, 0)})
        .attr('stroke-width', 3)
        .attr('d', function(d) {return drawgpm(d.v)});
    
  }, [margins, height, width, definition]);

  //net profit margin
  useEffect(() => {
    d3.select("#npm").html("");
      if (margins == null || definition2 == false) return;
      const svg = d3.select(svgRef2.current)
              .attr('width', width2)
              .attr('height', height2)
              .attr('padding', padding)
  
      const xScale = d3.scalePoint()
          .domain(incomeInfo['date'])
          .range([0+padding2, width2-padding2]);
          
      const yScale = d3.scaleLinear()
          .domain([Math.floor(minValuenpm.current), Math.ceil(maxValuenpm.current)])
          .range([height2-padding2, 0+padding2]);
  
      const xAxis = d3.axisBottom(xScale)
          .ticks(incomeInfo['date'].length)
          .tickSizeOuter(0);

      const yAxis = d3.axisLeft(yScale)
          .ticks(5);
  
      const drawgpm = d3.line()
        .x(function (d) {return xScale(d['fiscalDateEnding'])})
        .y(function (d) {return yScale(d['npm'])});


      //gross profit margin
      //net profit margin
      svg.selectAll('.gpm')
      .data(margins)
      .join('path')
        .attr('class', 'line')
        .attr('fill', 'None')
        .attr('stroke', function(d) {return update_color(d.key, 0)})
        .attr('stroke-width', 3)
        .attr('d', function(d) {return drawgpm(d.v)});
  }, [margins, height2, width2, definition2]);
  

  return (
    <>
    <div className='svg-top' onClick={() => setDefinition(definition => !definition)}>
      {definition ? (
        <div style={{height: '100%', width: '100%'}}><svg ref={svgRef} id='gpm'></svg></div>
      ) : (
        <div style={{display: 'flex', justifyContent:'center', alignItems:'center', textAlign: 'center', height: '100%', width: '100%'}}>
          <p style={{fontSize: '2rem', color: '#7A7A7A'}}>Gross Profit Margin</p>
        </div>
      )}

    </div>
    <div className='svg-bottom' onClick={() => setDefinition2(definition2 => !definition2)}>
      {definition2 ? (
          <svg ref={svgRef2} id='npm'></svg>
        ) : (
          <div style={{display: 'flex', justifyContent:'center', alignItems:'center', textAlign: 'center', height: '100%', width: '100%'}}>
            <p style={{fontSize: '2rem', color: '#7A7A7A'}}>Net Profit Margin</p>
          </div>
        )}
    </div>
    </>
  )
}
