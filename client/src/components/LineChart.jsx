import React, { useState, useRef, useEffect } from 'react'
import { myconfig } from '../assets/config';
import './LineChart.css'
import * as d3 from 'd3';
import axios from 'axios';

export const LineChart = ({preprationinfo, h, w, update_selection, update_color, setFailure}) => {
  //master data
  const [PriceInfo, setPriceInfo] = useState(null);
  const [DateSelection, setDateSelection] = useState('0');
  async function get_price_data(tickers) {
    const requestInput = tickers.map((ticker) => 'ticker=' + ticker).join('&')
    try {
      return await axios.get(`${myconfig.linktoBackend}/api/get_price?` + requestInput + '&time=' + DateSelection);
    } catch (e) {
      console.log(e)
    }
  };
  

  // information about the chart
  const svgRef = useRef();
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const padding = Math.min(Math.min(0.1 * width, 0.1 * height), 20);
  useEffect(() =>{
    setHeight(svgRef.current.parentElement.offsetHeight);
    setWidth(svgRef.current.parentElement.offsetWidth);
  }, [h, w]);

  var focus;
  var xScale;
  var xScale_display;
  var yScale;
  var line;

  function assignDate (selection) {
    setDateSelection(selection);
  }

  function scalePointPosition(xPos) {
    var domain = xScale.domain(); 
    var displayRangePoints = domain.map(date => {
      return xScale_display(Date.parse(date))
    })
    var yPos = domain[d3.bisectCenter(displayRangePoints, xPos)];
    return yPos;
  };

  function draw_graph (draw_with_ani) {

    //draw lines
    d3.select(svgRef.current).html("");
    if (PriceInfo === null) return;

    xScale_display = d3.scaleTime()
    .domain(d3.extent(PriceInfo['mkt-calendar'].map(date => {
      return new Date(date);
    })))
    .range([0+padding, width-padding]); //pixel range

    //y scale
    xScale = d3.scalePoint()
      .domain(PriceInfo['mkt-calendar'])
      .range([0+padding, width-padding]);

    yScale = d3.scaleLinear()
      .domain([PriceInfo['batch-MinMax']['min']-1, PriceInfo['batch-MinMax']['max']+1])
      .range([height-padding, padding]);

    //setup function to draw lines
    line = d3.line()
      .x((d) => xScale_display(Date.parse(d['date']))) // return coordnate of each points
      .y((d) => yScale(d['adj-percentage']))
      .curve(d3.curveMonotoneX);

    //zero line
    d3.select(svgRef.current)
      .append('line')
      .style('fill', 'none')
        .style('stroke', '#bbbaba')
        .style('opacity', 1)
        .attr('y1', yScale(0))
        .attr('y2', yScale(0))
        .attr('x1', padding)
        .attr('x2', width-padding)
        .style("fill", "none")
        .style('stroke-width', '1.5px');

    d3.select(svgRef.current)
        .append("text")
          .attr("x", width-padding-10)
          .attr("y", yScale(0)-10) // 100 is where the first dot appears. 25 is the distance between dots
          .style("fill", '#bbbaba')
          .attr('id', 'text')
          .text('0%')
          .attr("text-anchor", "left")
          .attr('font-size', '0.75em')
          .style("alignment-baseline", "central");

    ///////////END Zero Line/////////////////////

    if (draw_with_ani) {
      d3.select(svgRef.current)
      .selectAll('.line')
      .data(PriceInfo['mkt-data'])
      .join('path')
        .attr('fill', 'none')
        .attr('stroke', function(d) { return update_color(Object.keys(d)[0], 0)})
        .attr('stroke-width', 3)
        .attr('id', 'drawpath')
        .attr('pathLength', 1)
        .attr('d', function(d) {
          return line(d[Object.keys(d)]['data'])
        });
    }else {
      d3.select(svgRef.current)
      .selectAll('.line')
      .data(PriceInfo['mkt-data'])
      .join('path')
        .attr('fill', 'none')
        .attr('stroke', function(d) { return update_color(Object.keys(d)[0], 0)})
        .attr('stroke-width', 3)
        .attr('pathLength', 1)
        .attr('d', function(d) {
          return line(d[Object.keys(d)]['data'])
        });
    }


    // Create a rect on top of the svg area: this rectangle recovers mouse position
    d3.select('#event').remove();
    d3.select(svgRef.current)
      .append('rect')
      .style("fill", "none")
      .style("pointer-events", "all")
      .attr('width', width)
      .attr('height', height)
      .attr('id', 'event')
      .on('mouseover', mouseover)
      .on('mousemove', mousemove)
      .on('mouseout', mouseout);

    //vertical line
    focus = d3.select(svgRef.current)
      .append('line')
      .style('fill', 'none')
        .style('stroke', '#bbbaba')
        .style('opacity', 0)
        .attr('y1', 0)
        .attr('y2', height - padding)
        .style("fill", "none")
        .style('stroke-width', '1.5px');
    
    PriceInfo['mkt-data'].map(json => {
      const val = json[Object.keys(json)[0]]['data']
      if (val == undefined) {
        update_selection(Object.keys(json)[0], '--')
      }else{
        update_selection(Object.keys(json)[0], `${val[val.length - 1]['adj-percentage'].toFixed(2)}`)
      }
    })
  }
  function mouseover() {
    focus.style('opacity', function () { return 1});
  }

  function mousemove() {
    // recover coordinate we need
    var x0 = scalePointPosition(d3.pointer(event, this)[0]);
    focus
      .attr("x1", xScale_display(Date.parse(x0)))
      .attr('x2', xScale_display(Date.parse(x0)))

  
    PriceInfo['mkt-data'].map(json => {
      const val = json[Object.keys(json)[0]]['data'].find(item => item['date'] == x0)
      if (val == undefined) {
        update_selection(Object.keys(json)[0], '--')
      }else{
        update_selection(Object.keys(json)[0], `${val['adj-percentage'].toFixed(2)}`)
      }
    })

  }

  function mouseout() {
    focus.style("opacity", function () {return 0});
  }


  //update data
  useEffect(() => {
    if (preprationinfo.length === 0) {
      setPriceInfo(null);
    }
    get_price_data(preprationinfo.map((info) => info.ticker))
      .then(res => {
        if (res.status != 200){
          setFailure(true);
          return;
        }
        setPriceInfo(res.data);
      })
  }, [preprationinfo, DateSelection])

  
  //update graph
  useEffect(
    () => {
      draw_graph(true)
    }, [PriceInfo])

    //make sure it doesn't redraw when resizing window
    //very stupid fix but it works
  useEffect(
    () => {
      draw_graph(false)
    }, [height, width])


  return (
    <>
      <div className='line-chart-container-main'>
          <svg ref={svgRef} width='100%' height='100%' className='axisWhite' />
      </div>
      <div className='selection-container'>
          <div className='button-collections' onChange={event => assignDate(event.target.value)}>
          <input className='radio-input' type="radio" value="0" name="time_select" id='radio1' defaultChecked/> <label htmlFor="radio1">1W</label>
          <input className='radio-input' type="radio" value="1" name="time_select" id='radio2'/> <label htmlFor="radio2">1M</label>
          <input className='radio-input' type="radio" value="2" name="time_select" id='radio3'/> <label htmlFor="radio3">3M</label>
          <input className='radio-input' type="radio" value="3" name="time_select" id='radio4'/> <label htmlFor="radio4">1Y</label>
          <input className='radio-input' type="radio" value="4" name="time_select" id='radio5'/> <label htmlFor="radio5">3Y</label>
          <span></span>
          </div>
      </div>
    </>

  )
}
