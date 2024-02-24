import React, { useEffect, useState } from 'react'
import { myconfig } from '../assets/config';
import {BsX} from 'react-icons/bs'
import "./InfoCard.css"
import { TailSpin } from "react-loader-spinner";
import axios from 'axios';


export const InfoCard = ({info, delete_info, data_info, setFailure}) => {
  
  const [isLoading, setloading] = useState(true);
  const [companyinfo, setCompanyInfo] = useState(null);
  const color = `linear-gradient(23deg, rgba(2,0,36,1) 2%, ${info.color} 76%)`;

  async function get_info(ticker) {
    try {
      await axios.get(`${myconfig.linktoBackend}/api/get_info?ticker=` + ticker)
        .then(res => {
          if (res.status != 200){
            setFailure(true);
            return;
          }
          setloading(false);
          setCompanyInfo(res.data);
        })
    } catch (e) {
      console.log(e);
    }
  }
  useEffect(() => {
      const fetch_info = data_info.find((a) => a.ticker === info.ticker);
      if (fetch_info != undefined){
        if (fetch_info.status === 'complete') {
          get_info(info.ticker);
        }
      }
  }, [data_info]);

  return (
    <>
      <div className='card' style={{background : color}}>
        {
          isLoading ? (
            <>
            <div className='spinner-contianer'><TailSpin wrapperClass='spinner' color="white"/><h3 style={{color : '#ddd'}}>Loading {info.ticker}</h3></div>
            </>
          ) : (
            <>
            <div className='title'> 
              <h2 className='name'>{info.ticker}</h2>
              <button className='close-btn' onClick={() => delete_info(info.ticker)}><BsX className='close-icon'/></button>
            </div>
            <h6 style={{color: 'white'}}>{info.name} {info.exchange}</h6>
            <div className="info">
              <div className='info-list'>{companyinfo.mktcap}<p style={{marginLeft: "auto", color: '#ddd'}}>MKT CAP</p></div>
              <div className='info-list'>{companyinfo.avgVol}<p style={{marginLeft: "auto", color: '#ddd'}}>AVG VOL</p></div>
              <div className='info-list'>{companyinfo.eps}<p style={{marginLeft: "auto", color: '#ddd'}}>EPS</p></div>
              <div className='info-list'>{companyinfo.dividend}<p style={{marginLeft: "auto", color: '#ddd'}}>Dividend</p></div>
            </div>
            <h1 style={{color: 'white'}}>{info['select']}%</h1>
            </>
          )
        }
      </div>
    </>
  )
}
