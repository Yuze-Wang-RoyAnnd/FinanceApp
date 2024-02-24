import React, { useEffect, useRef, useState } from 'react';
import { myconfig } from '../../assets/config';
import './CashCharts.css';
import axios from "axios";
import * as d3 from 'd3';

export const CashCharts = ({preprationinfo, h, w, update_color, get_mix_gradient, setFailure}) => {
    
    
    const [cashInfo, setCashInfo] = useState(null);
    const [definition, setDefinition] = useState(true);
    const [currentCash, setcurrentCash] = useState(null);
    const [normalized, setNormalized] = useState(true);
    const [mixgradient, setMixgradient] = useState('');
    const [dates, setdates] = useState('');
    let maxValue = useRef(0);
    let minValue = useRef(0);

    async function get_balance_data(tickers) {
        const requestInput = tickers.map((ticker) => 'ticker=' + ticker).join('&')
        try {
            return await axios.get(`${myconfig.linktoBackend}/api/get_cash?` + requestInput)
        }catch (e) {
            console.log(e)
        }
    }

    const [width, setWidth] = useState(0);
    const [height, setHeight] = useState(0);
    var svgRef = useRef();
    const padding = Math.min(Math.min(0.1 * width, 0.1 * height), 25);
    useEffect(() =>{
        if (definition == false) return;
        setHeight(svgRef.current.parentElement.offsetHeight);
        setWidth(svgRef.current.parentElement.offsetWidth);
    }, [h, w, definition]);

    useEffect(() => {
        if (preprationinfo.length === 0) {
            setCashInfo(null);
            return;
        }
        get_balance_data(preprationinfo.map((info) => info.ticker))
        .then(response => {
            if (response.status != 200){
                setFailure(true);
                return;
            }
            setCashInfo(response.data);
            setdates(`${response.data['date'][0]} - ${response.data['date'][response.data['date'].length - 1]}`)
            setMixgradient(get_mix_gradient());
        });
    }, [preprationinfo])

    useEffect(() => {
        if (cashInfo == null) {
            setcurrentCash(null);
            return;
        };
        maxValue.current = 0;
        minValue.current = 0;
        setcurrentCash(cashInfo['cash_data'].map((entry) => {
            var key = Object.keys(entry)[0];
            var values = Object.values(entry)[0];
            var initcashIn = 0;
            var initcashOut = 0;
            if (normalized) {
                for (var i = 0; i < Object.keys(values[0]).length; i++) {
                    if (parseInt(values[0][Object.keys(values[0])[i]]) < 0) {
                        initcashOut += parseInt(values[0][Object.keys(values[0])[i]]);
                    }else{
                        initcashIn += parseInt(values[0][Object.keys(values[0])[i]]);
                    }
                }
                return { key: key, v : values.map(item => {
                    var curcashIn = 0;
                    var curcashOut = 0;
                    for (var i = 0; i < Object.keys(item).length; i++) {
                        if (parseInt(item[Object.keys(item)[i]]) < 0) {
                            curcashOut += parseInt(item[Object.keys(item)[i]]);
                        }else{
                            curcashIn += parseInt(item[Object.keys(item)[i]]);
                        }
                    }
                    if (initcashIn == 0 && curcashIn != 0){
                        initcashIn = curcashIn;
                        curcashIn = 1;
                    }else{
                        curcashIn /= initcashIn;
                    }
                    if (initcashOut == 0 && curcashOut != 0) {
                        initcashOut = curcashOut;
                        curcashOut = 1;
                    }else{
                        curcashOut /= initcashOut;
                    }
                    maxValue.current = Math.max(curcashIn, maxValue.current);
                    minValue.current = Math.min(-curcashOut, minValue.current);
                    return {'fiscalDateEnding' : item['fiscalDateEnding'], 'cashin': curcashIn, 'cashout': -curcashOut, 'group': key};
                })};
            }else{
                return { key: key, v : values.map(item => {
                    var curcashIn = 0;
                    var curcashOut = 0;
                    for (var i = 0; i < Object.keys(item).length; i++) {
                        if (parseInt(item[Object.keys(item)[i]]) < 0) {
                            curcashOut += parseInt(item[Object.keys(item)[i]]);
                        }else{
                            curcashIn += parseInt(item[Object.keys(item)[i]]);
                        }
                    }
                    maxValue.current = Math.max(curcashIn, maxValue.current);
                    minValue.current = Math.min(curcashOut, minValue.current);
                    return {'fiscalDateEnding' : item['fiscalDateEnding'], 'cashin': curcashIn, 'cashout': curcashOut, 'group': key};
                })};
            }

        }));
    }, [cashInfo, normalized]);

    useEffect(() => {
        d3.select("#cashC").html("");
        if (currentCash == null || definition == false) return;

        const svg = d3.select(svgRef.current)
            .attr('width', width)
            .attr('height', height)
            .attr('padding', padding)

        const xScale = d3.scaleBand()
            .domain(cashInfo['date'])
            .range([0+padding, width-padding])
            .padding(0.2);


        const xSubgroup = d3.scaleBand()
            .domain(preprationinfo.map(item => item.ticker))
            .range([0, xScale.bandwidth()])
            .padding([0.05]);
            
        const yScale = d3.scaleLinear()
            .domain([Math.floor(minValue.current), Math.ceil(maxValue.current)])
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
            .data(currentCash)
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
            .attr("y", function(d) { return (yScale(d['cashin']))})
            .attr("height", function(d) {return yScale(0) - yScale(d['cashin']);})
            .attr("width", xSubgroup.bandwidth())
            .attr('fill', function(d) {return update_color(d['group'], 0)})
        //Investing Cash
        g.append('rect')
            .attr("x", function(d) {return (xSubgroup(d['group']) + xScale(d['fiscalDateEnding']))})
            .attr("y", function(d) {return yScale(0)})
            .attr("height", function(d) {return yScale(d['cashout']) - yScale(0);})
            .attr("width", xSubgroup.bandwidth())
            .attr('fill', function(d) {return update_color(d['group'], -30)})


    }, [currentCash, height, width, definition])
        
  return (
    <>
        <div className='cashName'onClick={() => setNormalized(normalized => !normalized)} style={{borderImage: `${mixgradient} 1`}}>
            {
                normalized ? (
                    <p style={{fontSize: '2rem'}}>&nbsp;Cash Flow Statment Normalized</p>
                ): (
                    <p style={{fontSize: '2rem'}}>&nbsp;Cash Flow Statment UnNormalized</p>
                ) 
            }
        <p style={{fontSize: '1.5rem', marginLeft: 'auto'}}>{dates}&nbsp;</p>
        </div>
        <div className='svg2-container' onClick={() => setDefinition(definition => !definition)}>
        {definition ? (
            <svg ref={svgRef} id='cashC'></svg>
        ) : (
            <div style={{display: 'flex', justifyContent:'center', alignItems:'center', textAlign: 'center', height: '100%', width: '100%'}}>
                <p style={{fontSize: '2rem', color: '#7A7A7A'}}>Cash Flow</p>
            </div>
        )}
    </div>
    </>

  )
}
