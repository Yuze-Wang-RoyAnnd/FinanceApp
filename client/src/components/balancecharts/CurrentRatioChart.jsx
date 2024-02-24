import  React, { useEffect, useRef, useState }  from 'react';
import './RatioChart.css';
import * as d3 from 'd3';

export const CurrentRatioChart = ({balanceInfo, h, w, update_color}) => {

    const [definition, setDefinition] = useState(true);
    const [width, setWidth] = useState(0);
    const [height, setHeight] = useState(0);
    const [currentRatio, setCurrentRatio] = useState(null);
    var svgRef = useRef();
    let maxValue = useRef(0);
    let minValue = useRef(0);
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
                var cur = 0
                if (item['currentLiabilities'] != 0) cur = item['currentAssets'] / item['currentLiabilities'];
                maxValue.current = Math.max(cur, maxValue.current);
                minValue.current = Math.min(cur, minValue.current);
                return {'currentRatio' : cur, 'fiscalDateEnding' : item['fiscalDateEnding']}
            })};
        }));
    }, [balanceInfo])

    useEffect(() => {
        d3.select("#RCURR").html("");
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
            .y(function (d) {return yScale(d['currentRatio'])});

          
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
    <div className='currentR' onClick={() => setDefinition(definition => !definition)}>
        { definition ? (
            <svg ref={svgRef} id='RCURR'></svg>
        ): (
            <div style={{display: 'flex', justifyContent:'center', alignItems:'center', textAlign: 'center', height: '100%', width: '100%'}}>
                    <p style={{fontSize: '2rem', color: '#7A7A7A'}}>Liquidity Ratio (Current)</p>
            </div>
        )} 
    </div>
  )
}
