import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import './GeneralChart.css'

export const EBITAProfit = ({incomeInfo, h, w, update_color, normalized}) => {

    const [definition, setDefinition] = useState(true);
    const [definition2, setDefinition2] = useState(true);
    const [ebitaprofit, setEbitaprofit] = useState(null);
    const [width, setWidth] = useState(0);
    const [height, setHeight] = useState(0);
    const [width2, setWidth2] = useState(0);
    const [height2, setHeight2] = useState(0);

    let maxebita = useRef(0);
    let minebita = useRef(0);
    let maxgp = useRef(0);
    let mingp = useRef(0);

    const padding = Math.min(Math.min(0.1 * width, 0.1 * height), 25);
    const padding2 = Math.min(Math.min(0.1 * width2, 0.1 * height2), 25);
    useEffect(() =>{
        if (definition == false) return;
        setHeight(svgRef.current.parentElement.offsetHeight);
        setWidth(svgRef.current.parentElement.offsetWidth);
    }, [h, w, definition]);
    useEffect(() => {
        if (definition2 == false) return;
        setHeight2(svgRef2.current.parentElement.offsetHeight);
        setWidth2(svgRef2.current.parentElement.offsetWidth);
    }, [h, w, definition2]);
    const svgRef = useRef();
    const svgRef2 = useRef();

    useEffect(() => {
        if (incomeInfo == null) {
            setEbitaprofit(null);
            return;
        };
        maxebita.current = 0;
        minebita.current = 0;
        maxgp.current = 0;
        mingp.current = 0;
        console.log(incomeInfo['income_data']);

        setEbitaprofit(incomeInfo['income_data'].map((entry) =>{
        var key = Object.keys(entry)[0];
        var values = Object.values(entry)[0];
        if (normalized) {
            const initItem = values.find(item => item['totalRevenue'] != 0);
            const initebita = values.find(item => item['EBIT'] != 0);
            return {key: key, v : values.map(item => {
                console.log(item['EBIT']);
                var gross_profit = 0;
                var ebita = 0;
                if (initItem != undefined){
                    gross_profit = Math.abs((item['totalRevenue'] - item['costOfRevenue']) - (initItem['totalRevenue'] - initItem['costOfRevenue'])) / Math.abs(initItem['totalRevenue'] - initItem['costOfRevenue']);
                    gross_profit = ((item['totalRevenue'] - item['costOfRevenue']) < 0) ? (gross_profit + 1) * -1 : (gross_profit + 1);
                }
                if (initebita != undefined) {
                    ebita = Math.abs(item['EBIT'] - initebita['EBIT']) / Math.abs(initebita['EBIT']);
                    ebita = (item['EBIT'] < 0) ? (ebita + 1) * -1 : (ebita + 1);
                }
                
                maxebita.current = Math.max(ebita, maxebita.current);
                minebita.current = Math.min(ebita, minebita.current);
                maxgp.current = Math.max(maxgp.current, gross_profit);
                mingp.current = Math.min(mingp.current, gross_profit);
                return {'fiscalDateEnding' : item['fiscalDateEnding'], 'gp' : gross_profit, 'ebita': ebita, 'group': key}
            })};
        }else{
            return {key: key, v : values.map(item => {
                var gross_profit = (item['totalRevenue'] - item['costOfRevenue']);
                var ebita = item['EBIT'];
                maxebita.current = Math.max(ebita, maxebita.current);
                minebita.current = Math.min(ebita, minebita.current);
                maxgp.current = Math.max(maxgp.current, gross_profit);
                mingp.current = Math.min(mingp.current, gross_profit);
                return {'fiscalDateEnding' : item['fiscalDateEnding'], 'gp' : gross_profit, 'ebita': ebita, 'group': key}
            })};
        }

        }));
    }, [incomeInfo, normalized]);



    useEffect(() => {
        d3.select("#ebita").html("");
            if (ebitaprofit == null || definition == false) return;
            const svg = d3.select(svgRef.current)
                .attr('width', width)
                .attr('height', height)
                .attr('padding', padding)

            const xScale = d3.scaleBand()
                .domain(incomeInfo['date'])
                .range([0+padding, width-padding])
                .padding(0.2);


            const xSubgroup = d3.scaleBand()
                .domain(incomeInfo['income_data'].map(item => Object.keys(item)[0]))
                .range([0, xScale.bandwidth()])
                .padding([0.05]);

            const yScale = d3.scaleLinear()
                .domain( normalized ? (
                    [(Math.round(minebita.current * 10) - 1) / 10, (Math.round(maxebita.current * 10) + 1) / 10]
                ): (
                    [minebita.current, maxebita.current]
                ))
                .range([height-padding, 0+padding]);

            const yAxis = d3.axisLeft(yScale)
                .ticks(5);

            svg.append('g')
            .attr("class", "grid")
            .attr('transform', `translate(${padding}, 0)`)
            .call(d3.axisLeft(yScale)
                    .tickSize(-(width - 2 * padding))
                    .ticks(5)
                    .tickFormat("")
            );

            svg.append('g')
            .attr("class", "grid")
            .attr('transform', `translate(${padding + 20}, -7)`)
            .style('stroke', '#bbbaba')
            .style('stroke-width', '0.5px')
            .call(d3.axisLeft(yScale)
                .ticks(5)
                .tickSizeOuter(0)
                .tickSize(0)
                .tickFormat(function(d, i) {
                    if (d < 1 && d > -1) return d;
                    var order = Math.floor(Math.log(Math.abs(d)) / Math.LN10+ 0.000000001); // because float math sucks like that
                    const size = ['', 'k', 'm', 'b', 't'];
                    const select = Math.floor(order / 3);
                    return d / Math.pow(10, order) + size[select];
            }));

            var g = svg.selectAll('.bar')
                .data(ebitaprofit)
                .enter()
                .append('g')
                    .selectAll('.subbar')
                    .data(function(d) {return d.v})
                    .enter()
                    .append('g')
                    .classed('rect', true)

            //cashin
            g.append('rect')
                .attr("x", function(d) {return (xSubgroup(d['group']) + xScale(d['fiscalDateEnding']))})
                .attr("y", function(d) {
                    if (d['ebita'] < 0) {
                        return yScale(0);
                    }else{
                        return yScale(d['ebita']);
                    }
                })
                .attr("height", function(d) {
                    if (d['ebita'] < 0) {
                        return yScale(d['ebita']) - yScale(0);
                    }else{
                        return yScale(0) - yScale(d['ebita']);
                    }
                    })
                .attr("width", xSubgroup.bandwidth())
                .attr('fill', function(d) {return update_color(d['group'], 0)});
    }, [ebitaprofit, height, width, definition]);

    //gp
    useEffect(() => {
        d3.select("#grossprofit").html("");
            if (ebitaprofit == null || definition2 == false) return;
            const svg = d3.select(svgRef2.current)
                .attr('width', width2)
                .attr('height', height2)
                .attr('padding', padding2)

            const xScale = d3.scaleBand()
                .domain(incomeInfo['date'])
                .range([0+padding2, width-padding2])
                .padding(0.2);


            const xSubgroup = d3.scaleBand()
                .domain(incomeInfo['income_data'].map(item => Object.keys(item)[0]))
                .range([0, xScale.bandwidth()])
                .padding([0.05]);
            const yScale = d3.scaleLinear()
                .domain(normalized ? 
                    (
                        [(Math.round(mingp.current * 10) - 1) / 10, (Math.round(maxgp.current * 10) + 1) / 10]
                    ) :(
                        [(mingp.current), (maxgp.current)]
                    ))
                .range([height2-padding2, 0+padding2]);
            const yAxis = d3.axisLeft(yScale)
                .ticks(5);

            svg.append('g')
            .attr("class", "grid")
            .attr('transform', `translate(${padding2}, 0)`)
            .call(d3.axisLeft(yScale)
                    .tickSize(-(width2 - 2 * padding2))
                    .ticks(5)
                    .tickFormat("")
            );

            svg.append('g')
            .attr("class", "grid")
            .attr('transform', `translate(${padding2 + 20}, -7)`)
            .style('stroke', '#bbbaba')
            .style('stroke-width', '0.5px')
            .call(d3.axisLeft(yScale)
                .ticks(5)
                .tickSizeOuter(0)
                .tickSize(0)
                .tickFormat(function(d, i) {

                    if (d < 1 && d > -1) return d;
                    var order = Math.floor(Math.log(Math.abs(d)) / Math.LN10+ 0.000000001); // because float math sucks like that
                    const size = ['', 'k', 'm', 'b', 't'];
                    const select = Math.floor(order / 3);
                    return d / Math.pow(10, order) + size[select];
            }));

            var g = svg.selectAll('.bar')
                .data(ebitaprofit)
                .enter()
                .append('g')
                    .selectAll('.subbar')
                    .data(function(d) {return d.v})
                    .enter()
                    .append('g')
                    .classed('rect', true)

            //cashin
            g.append('rect')
                .attr("x", function(d) {return (xSubgroup(d['group']) + xScale(d['fiscalDateEnding']))})
                .attr("y", function(d) {
                    if (d['gp'] < 0) {
                        return yScale(0);
                    }else{
                        return yScale(d['gp']);
                    }
                })
                .attr("height", function(d) {
                    if (d['gp'] < 0) {
                        return yScale(d['gp']) - yScale(0);
                    }else{
                        return yScale(0) - yScale(d['gp']);
                    }
                    })
                .attr("width", xSubgroup.bandwidth())
                .attr('fill', function(d) {return update_color(d['group'], 0)});
    }, [ebitaprofit, height2, width2, definition2]);


    
    return (
        <>
        <div className='svg-top-1' onClick={() => setDefinition(definition => !definition)}>
            {definition ? (
                <svg ref={svgRef} id='ebita'></svg>
            ): (
                <div style={{display: 'flex', justifyContent:'center', alignItems:'center', textAlign: 'center', height: '100%', width: '100%'}}>
                    <p style={{fontSize: '2rem', color: '#7A7A7A'}}>EBIT</p>
                </div>
            )}
        </div>
        <div className='svg-bottom-1' onClick={() => setDefinition2(definition2 => !definition2)}>
            {definition2 ? (
                <svg ref={svgRef2} id='grossprofit'></svg>
            ): (
                <div style={{display: 'flex', justifyContent:'center', alignItems:'center', textAlign: 'center', height: '100%', width: '100%'}}>
                    <p style={{fontSize: '2rem', color: '#7A7A7A'}}>Gross Profit</p>
                </div>
            )}
        </div>

        </>
    )
}
