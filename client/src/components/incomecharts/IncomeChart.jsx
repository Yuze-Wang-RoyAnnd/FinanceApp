import React, { useEffect, useRef, useState } from 'react';
import { myconfig } from '../../assets/config';
import axios from "axios";
import './IncomeChart.css'
import { ProfitMargin } from './ProfitMargin';
import { EBITAProfit } from './EBITAProfit';
import { tree } from 'd3';

export const IncomeChart = ({preprationinfo, h, w, update_color, get_mix_gradient, setFailure}) => {
  
  const [incomeInfo, setIncomeInfo] = useState(null);
  const [normalized, setNormalized] = useState(true);
  const [mixgradient, setMixgradient] = useState('');
  const [dates, setdates] = useState('');
  async function get_balance_data(tickers) {
      const requestInput = tickers.map((ticker) => 'ticker=' + ticker).join('&')
      try {
          return await axios.get(`${myconfig.linktoBackend}/api/get_income?` + requestInput)
      }catch (e) {
          console.log(e)
      }
  }
  
  useEffect(() => {
    if (preprationinfo.length === 0) {
      setIncomeInfo(null);
      return;
    }
    get_balance_data(preprationinfo.map((info) => info.ticker))
    .then(response => {
      if (response.status != 200) {
        setFailure(true);
        return;
      }
      setIncomeInfo(response.data);
      setdates(`${response.data['date'][0]} - ${response.data['date'][response.data['date'].length - 1]}`)
      setMixgradient(get_mix_gradient());
    });

  }, [preprationinfo])


  return (
    <>
    <div className="incomeName" onClick={() => setNormalized(normalized => !normalized)} style={{borderImage: `${mixgradient} 1`}}>
      {
        normalized ? (
          <p style={{fontSize: '2rem'}}>&nbsp;Income Statment Normalized</p>
        ) : (
          <p style={{fontSize: '2rem'}}>&nbsp;Income Statment UnNormalized</p>
        )
      }
    <p style={{fontSize: '1.5rem', marginLeft: 'auto'}}>{dates}&nbsp;</p>
    </div>

    <div className='svg3-container'>
      <div className='svg-left'>
        <ProfitMargin incomeInfo={incomeInfo} h={h} w={w} update_color={update_color}/>
      </div>
      <div className='svg-right'>
        <EBITAProfit incomeInfo={incomeInfo} h={h} w={w} update_color={update_color} normalized={normalized}/>
      </div>
    </div>
    </>
  )
}
