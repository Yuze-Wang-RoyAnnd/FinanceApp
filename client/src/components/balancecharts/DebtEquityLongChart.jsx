import React, { useEffect, useRef, useState } from 'react'
import './RatioChart.css'
import * as d3 from 'd3';


export const DebtEquityLongChart = ({balanceInfo, h, w, update_color}) => {

  const [definition, setDefinition] = useState(true);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [currentRatio, setCurrentRatio] = useState(null);
  let maxValue = useRef(0);
  let minValue = useRef(0);
  var svgRef = useRef();
  const padding = Math.min(Math.min(0.1 * width, 0.1 * height), 25);
  useEffect(() =>{
      if (definition == false) return;
      setHeight(svgRef.current.parentElement.offsetHeight);
      setWidth(svgRef.current.parentElement.offsetWidth);
  }, [h, w, definition]);

  useEffect(() => {
    if (balanceInfo == null) {
      setCurrentRatio(null);
      return;
    }
    setCurrentRatio(balanceInfo['balance_data'].map((entry) => {
      var key = Object.keys(entry)[0];
      var values = Object.values(entry)[0];
      return { key: key, v : values.map(item => {
          var de = 0;
          if (item['totalEquity'] != 0) de = item['long_debt'] / item['totalEquity'];
          maxValue.current = Math.max(de, maxValue.current);
          minValue.current = Math.min(de, minValue.current);
          return {'fiscalDateEnding' : item['fiscalDateEnding'], 'DERatio_long' : de}
      })};
    }))
  }, [balanceInfo]);

    useEffect(() => {
        d3.select("#DELong").html("");
        if (currentRatio == null || definition == false) return;

        const svg = d3.select(svgRef.current)
            .attr('width', width)
            .attr('height', height)
            .attr('padding', padding);
        
        const xScale = d3.scalePoint()
            .domain(balanceInfo['date'])
            .range([0+padding, width-padding]);
        
        const yScale = d3.scaleLinear()
            .domain([Math.floor(minValue.current), Math.ceil(maxValue.current)])
            .range([height-padding, 0+padding]);


        const yAxis = d3.axisLeft(yScale)
            .tickSizeOuter(0)
            .tickSizeInner(0)
            .ticks(5);

        const drawcurr = d3.line()
            .x(function (d) {return xScale(d['fiscalDateEnding'])})
            .y(function (d) {return yScale(d['DERatio_long'])});

        
        var g = svg.selectAll('.ratios')
        .data(currentRatio)
        .join('path')
            .attr("class", "line")
            .attr('fill', 'None')
            .attr('stroke', function(d) {return update_color(d.key, 0)})
            .attr('stroke-width', 3)
            .attr("d", function(d) {
                return drawcurr(d.v);
            });
        
        var gc = svg.selectAll('.ratios')
            .data(currentRatio)
            .enter()
            .append('g')
            .selectAll('.subcircle')
                .classed('circle', true)
                .data(function(d) {return d.v})
                .enter()
                .append('g');


    }, [currentRatio, height, width, definition])

  return (
    
    <div className='DEl' onClick={() => setDefinition(definition => !definition)}>
      {definition ? (
        <svg ref={svgRef} id='DELong'></svg>
      ): (
        <div style={{display: 'flex', justifyContent:'center', alignItems:'center', textAlign: 'center', height: '100%', width: '100%'}}>
            <p style={{fontSize: '2rem', color: '#7A7A7A'}}>Debt to Equity Ratio (Long Term Debt)</p>
        </div>
      )}

    </div>
  )
}
