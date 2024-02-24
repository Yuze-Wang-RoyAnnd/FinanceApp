import React, { useEffect, useRef, useState } from 'react';
import './BalanceChart.css';
import { CurrentRatioChart } from './CurrentRatioChart';
import { CashRatioChart } from './CashRatioChart';
import { DebtEquityLongChart } from './DebtEquityLongChart';
import { DebtEquityChart } from './DebtEquityChart';
import { myconfig } from '../../assets/config';
import axios from "axios"
import * as d3 from 'd3';

export const BalanceChart = ({preprationinfo, h, w, update_color, UsingTicker, get_mix_gradient, setFailure}) => {

    const [balanceInfo, setbalanceInfo] = useState(null);
    const [definition, setDefinition] = useState(true);
    const [balanceSheet, setBalanceSheet] = useState(null);
    const [normalized, setNormalized] = useState(true);
    const [mixgradient, setMixgradient] = useState('');
    const [dates, setdates] = useState('');
    async function get_balance_data(tickers) {
        const requestInput = tickers.map((ticker) => 'ticker=' + ticker).join('&')
        try {
            return await axios.get(`${myconfig.linktoBackend}/api/get_balance?` + requestInput)
        }catch (e) {
            console.log(e)
        }
    }

    const [width, setWidth] = useState(0);
    const [height, setHeight] = useState(0);
    const padding = Math.min(Math.min(0.1 * width, 0.1 * height), 25);
    useEffect(() =>{
        if (definition == false || UsingTicker == false) return;
        setHeight(svgRef.current.parentElement.offsetHeight);
        setWidth(svgRef.current.parentElement.offsetWidth);
    }, [h, w, definition]);
    const svgRef = useRef()
    let maxValue = useRef(0);
    let minValue = useRef(0);
    useEffect(() => {
        if (balanceInfo == null) {
            setBalanceSheet(null);
            return;
        }
        maxValue.current = 0;
        minValue.current = 0
        setBalanceSheet(balanceInfo['balance_data'].map((entry) => {
            var key = Object.keys(entry)[0];
            var values = Object.values(entry)[0];
            if (normalized) {
                const initEquity = values.find(item => item['totalEquity'] != 0);
                const initLiabiilty = values.find(item => item['totalLiabilities'] != 0);
                return { key: key, v : values.map(item => {

                    var cur_liabilities = 0;
                    var cur_equity =0;
                    if (initLiabiilty != undefined) {
                        cur_liabilities = Math.abs(item['totalLiabilities'] - initLiabiilty['totalLiabilities']) / Math.abs(initLiabiilty['totalLiabilities']);
                        cur_liabilities = (item['totalLiabilities'] < 0) ? (cur_liabilities+1) * -1 : (cur_liabilities+1);
                    }
                    if (initEquity != undefined) {
                        cur_equity = Math.abs(item['totalEquity'] - initEquity['totalEquity']) / Math.abs(initEquity['totalEquity']);
                        cur_equity = (item['totalEquity'] < 0) ? (cur_equity+1) * -1 : (cur_equity+1);
                    }
                    maxValue.current = Math.max(cur_equity, cur_liabilities, cur_equity + cur_liabilities, maxValue.current);
                    minValue.current = Math.min(cur_equity, cur_liabilities, cur_equity + cur_liabilities,  minValue.current);
                    return {'fiscalDateEnding' : item['fiscalDateEnding'], 'liabilities' : cur_liabilities, 'equity' : cur_equity, 'group' : key};
                })};
            }else{
                return { key: key, v : values.map(item => {
                    var cur_liabilities = item['totalLiabilities']
                    var cur_equity = item['totalEquity']
                    maxValue.current = Math.max(cur_equity, cur_liabilities, cur_equity +cur_liabilities, maxValue.current);
                    minValue.current = Math.min(cur_equity, cur_liabilities, cur_equity +cur_liabilities,  minValue.current);
                    return {'fiscalDateEnding' : item['fiscalDateEnding'], 'liabilities' : cur_liabilities, 'equity' : cur_equity, 'group' : key};
                })};
            }
        }));
    }, [balanceInfo, normalized])

    useEffect(() => {
        if (preprationinfo.length === 0) {
            setbalanceInfo(null);
            return;
        }
        get_balance_data(preprationinfo.map((info) => info.ticker))
        .then(response => {
            if (response.status != 200){
                setFailure(true);
                return;
            }
            setbalanceInfo(response.data);
            setdates(`${response.data['date'][0]} - ${response.data['date'][response.data['date'].length - 1]}`)
            setMixgradient(get_mix_gradient());
        })

    }, [preprationinfo]);



    useEffect(() => {
        d3.select("#reference").html("");
        if (balanceSheet == null || definition == false) return;
        const svg = d3.select(svgRef.current)
            .attr('width', width)
            .attr('height', height)
            .attr('padding', padding)

        const xScale = d3.scaleBand()
            .domain(balanceInfo['date'])
            .range([0+padding, width-padding])
            .padding(0.2);

        const xSubgroup = d3.scaleBand()
            .domain(preprationinfo.map(item => item.ticker))
            .range([0, xScale.bandwidth()])
            .padding([0.01]);
        
        const yScale = d3.scaleLinear()
            .domain([Math.floor(minValue.current), Math.ceil(maxValue.current)])
            .range([height-padding, 0+padding]);

        const xAxis = d3.axisBottom(xScale)
            .ticks(balanceInfo['date'].length)
            .tickSizeOuter(0);

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
            .data(balanceSheet)
            .enter()
            .append('g')
                .selectAll('.subbar')
                .data(function(d) {return d.v})
                .enter()
                .append('g')
                .classed('rect', true)
        
        g.append('rect')
            .attr("x", function(d) {return (xSubgroup(d['group']) + xScale(d['fiscalDateEnding']))})
            .attr("y", function(d) {
                if (d['liabilities'] < 0) {
                    return yScale(0);
                }else{
                    return yScale(d['liabilities']);
                }
                })
            .attr("height", function(d) {
                if (d['liabilities'] < 0) {
                    return yScale(d['liabilities']) - yScale(0);
                }else{
                    return yScale(0) - yScale(d['liabilities']);
                }
                })
            .attr("width", xSubgroup.bandwidth())
            .attr('fill', function(d) {return update_color(d['group'], 0)})
        g.append('rect')
            .attr("x", function(d) {return (xSubgroup(d['group']) + xScale(d['fiscalDateEnding']))})
            .attr("y", function(d) {
                if (d['liabilities'] < 0){
                    if (d['equity'] < 0) {
                        return yScale(d['liabilities'] + d['equity']);
                    }else{
                        return yScale(d['equity']);
                    }
                }else{
                    if (d['equity'] < 0){
                        return yScale(0);
                    }else{
                        return yScale(d['equity'] + d['liabilities']);
                    }
                }})
            .attr("height", function(d) {
                if (d['equity'] < 0) {
                    return yScale(d['equity']) - yScale(0);
                }else{
                    return yScale(0) - yScale(d['equity']);
                }
                })
            .attr("width", xSubgroup.bandwidth())
            .attr('fill', function(d) {return update_color(d['group'], -30)})
    }, [balanceSheet, height, width, definition])


  return (
    <>
    <div className='balanceName' onClick={() => setNormalized(normalized => !normalized)} style={{borderImage: `${mixgradient} 1`}}>{
        normalized ? (
            <p style={{fontSize: '2rem'}}>&nbsp;Balance Statment Normalized</p>
        ): (
            <p style={{fontSize: '2rem'}}>&nbsp;Balance Statment UnNormalized</p>
        )
    }
    <p style={{fontSize: '1.5rem', marginLeft: 'auto'}}>{dates}&nbsp;</p></div>
    <div className='svg-container' id='svg_container'>
        <div className='main'>
            {UsingTicker? (
            <div className='main-svg' onClick={() => setDefinition(definition => !definition)}>
            { definition ? (
                <svg ref={svgRef} id='reference'></svg>
            ) : (
                <div style={{display: 'flex', justifyContent:'center', alignItems:'center', textAlign: 'center', height: '100%', width: '100%'}}>
                        <p style={{fontSize: '2rem', color: '#7A7A7A'}}>Liabilities and Shareholder's Equity</p>
                </div>
            )}
            </div>
            ) : (
                <div/>
            )}
            <div className='sub-svg'>
                {UsingTicker ? (
                    <>
                    <DebtEquityLongChart balanceInfo={balanceInfo} h={h} w={w} update_color={update_color}/>
                    <CashRatioChart balanceInfo={balanceInfo} h={h} w={w} update_color={update_color}/>
                    </>
                ) : (
                    <div/>
                )}
            </div>
        </div>

        <div className='extras'>
            {UsingTicker ? (
                <>
                <CurrentRatioChart balanceInfo={balanceInfo} h={h} w={w} update_color={update_color}/>
                <DebtEquityChart balanceInfo={balanceInfo} h={h} w={w} update_color={update_color}/>
                </>
            ) : (
                <div/>
            )}
        </div>
    </div>
    </>
  )
}
