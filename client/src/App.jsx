import React, { useEffect, useRef, useState} from "react";
import "./App.css";
import { SearchBar } from "./components/searchbar/SearchBar";
import { SearchResultList } from "./components/searchbar/SearchResultList";
import { InfoCard } from "./components/InfoCard";
import useWindowDimensions from "./components/utility/useWindowDimensions";
import { BsChevronRight } from "react-icons/bs";
import { BsChevronLeft } from "react-icons/bs";
import { LineChart } from './components/LineChart'
import { BalanceChart } from "./components/balancecharts/BalanceChart";
import { CashCharts } from "./components/cashcharts/CashCharts";
import { IncomeChart } from "./components/incomecharts/IncomeChart";
import { ErrorPage } from "./ErrorPage";
import { myconfig } from "./assets/config";
import mySvg from './assets/logo.svg';
import axios from "axios"
import * as d3 from 'd3';

function App() {

  //data
  const [results, setResults] = useState([]); //{ticker, name, exchange, color}
  const [Information, setInformation] = useState([]); //list of ticker name
  const [PrepartionInfo, setPrepartionInfo] = useState([]); //list of ticker status
  const [failure, setFailure] = useState(false);

  //style information
  const [scrollPosition, setScrollPosition] = useState(0);
  const { height, width } = useWindowDimensions();
  const [UsingTicker, setUsingTicker] = useState(false);
  const [Searchheight, setSearchHeight] = useState(height);
  const containerRef = useRef();

  //#991CEB #EB1C88 #DD1DEB #561CEB #EB211C #EB681C #EB441C #991CEB
  const colors = useRef(['#0018DB', '#A700DB', '#6000DB', '#0040DB', '#00DBA5', '#0086DB', '#4F00DB', '#00C9DB']);
  const InformationCount = useRef(0);

  function getColor(){
    var r_c = colors.current[colors.current.length - 1];
    colors.current = colors.current.slice(0, colors.current.length -1)
    return r_c;
  }

  function update_color(ticker, percent){
    const color = Information.find(item => item.ticker == ticker)['color'];
    var R = parseInt(color.substring(1,3),16);
    var G = parseInt(color.substring(3,5),16);
    var B = parseInt(color.substring(5,7),16);

    R = parseInt(R * (100 + percent) / 100);
    G = parseInt(G * (100 + percent) / 100);
    B = parseInt(B * (100 + percent) / 100);

    R = (R<255)?R:255;  
    G = (G<255)?G:255;  
    B = (B<255)?B:255;  

    R = Math.round(R)
    G = Math.round(G)
    B = Math.round(B)

    var RR = ((R.toString(16).length==1)?"0"+R.toString(16):R.toString(16));
    var GG = ((G.toString(16).length==1)?"0"+G.toString(16):G.toString(16));
    var BB = ((B.toString(16).length==1)?"0"+B.toString(16):B.toString(16));

    return "#"+RR+GG+BB;
  }

  function get_mix_gradient(){
    const graident = 'linear-gradient(156deg, rgba(3,17,50,1) 25%, ';
    const c = Information.map((item, index) => item.color + 
      ` ${25 + ((75 / Information.length) * (index + 1))}%`).join(', ');
    
    return graident + c + ')';
  }

  //add card 
  const append_to_info = (value) => {
    console.log('clicked');
    var result = Information.find((item) => item.ticker === value.ticker)
    if (result === undefined && InformationCount.current <= 7) {
      //POST server to prepare data
      setInformation(Information => [...Information, {...value, 'color' : getColor(), 'select' : '--'}]);
      InformationCount.current += 1;
      var promise = prepare_data(value.ticker);
      promise.then((json) => {
        if (json.status == 201){
          setPrepartionInfo(PrepartionInfo => [...PrepartionInfo, {'ticker' : value.ticker, status : 'complete'}])
        }else{
          setFailure(true);
        }
      })
      .then(() => {
        axios.put(`${myconfig.linktoBackend}/api/update_accessor`, {'ticker' : value.ticker}); //update accessor
      });
    }
  }


  //remove card
  const delete_info = (ticker) => {
    console.log('delete')
    const colur = Information.find(item => item.ticker == ticker)['color'];
    colors.current = [...colors.current, colur];
    setInformation(Information => 
      Information.filter((a) =>
        a.ticker !== ticker
      )
    )
    setPrepartionInfo(PrepartionInfo => 
      PrepartionInfo.filter((a) =>
        a['ticker'] !== ticker
      )
    )
    InformationCount.current -= 1;
    remove_accessor(ticker)
  }
  
  //update
  const update_selection = (ticker, Currentvalue) => {
    setInformation(Information => Information.map(item => {
      if (item['ticker'] == ticker){
        item['select'] = Currentvalue;
        return item;
      }else{
        return item;
      }
    }));
  }

  async function remove_accessor(tickers) {
    console.log('remove accessor' + tickers )
    try {
      return await axios.put(`${myconfig.linktoBackend}/api/remove_accessor`, {
        'ticker' : tickers
      });
    } catch (e) {
      console.log(e);
    }
  }

  async function prepare_data(ticker) {
    console.log('prepare data for ' + ticker + '...')
    try {
      return await axios.post(`${myconfig.linktoBackend}/api/prepare`, {
        'ticker': ticker
      });
    } catch (e) {
      console.log(e);
    }
  }

  useEffect(() => {
    if (Information.length > 0) {
      setUsingTicker(true);
      setSearchHeight(Searchheight => {
        if (width <= 1000){
          return 0.05 * height;
        }else{
          return 0.08 * height;
        }
        });
    }
    else {
      setUsingTicker(false)
      setSearchHeight(Searchheight => height);
    }

  }, [Information, height])

  useEffect(() => {
    const handleTabClose = event => {
      /* the page is being discarded */
      event.preventDefault();
      setInformation(Information => {
        const tickers = Information.map(item => {
          colors.current = [...colors.current, item['color']];
          return item.ticker;
        })
        axios.delete(`${myconfig.linktoBackend}/api/selfClean`, {data :{'ticker': tickers}});
        return [];
      });
      setPrepartionInfo([]);
      InformationCount.current = 0;
      return (event.returnValue = 'before undload even triggered');
    };
    window.addEventListener('beforeunload', handleTabClose);
    return () => {

      window.removeEventListener('beforeunload', handleTabClose);
    };
  }, []);

  const handlescroll = (scrollAmount) => {
    const newScrollposition = scrollPosition + scrollAmount;
    setScrollPosition(newScrollposition);
    containerRef.current.scrollLeft = newScrollposition;
  }

  return (
    <div className="App">
      <div className="search-bar-container" style={{height:Searchheight, transition: 'all 0.2s'}}>
        <SearchBar setResults={setResults} />
        <div style={{position: 'relative', width: '40%', minWidth: '40%'}}><SearchResultList results={results} append_to_info={append_to_info}/></div>
      </div>

      {
        UsingTicker ? (
          <>
          <ErrorPage failure={failure}/>

          <div className="whole">
            <div className="l-c">
            <div className="info-card-container" ref={containerRef}>
                {
                  Information.map(item => {return <InfoCard info={item} key={item.index} delete_info={delete_info} data_info={PrepartionInfo} setFailure={setFailure}/>})
                }
              </div>

            </div>
            <div className="r-c">
              <div className="line-chart-container">
              <LineChart preprationinfo={PrepartionInfo} h={height} w={width} update_selection={update_selection} update_color={update_color} setFailure={setFailure}/>
              </div>



              <div className="balance-container">
                <BalanceChart preprationinfo={PrepartionInfo} h={height} w={width} update_color={update_color} UsingTicker={UsingTicker} get_mix_gradient={get_mix_gradient} setFailure={setFailure}/>
              </div>

              <div className="cash-container">
                <CashCharts preprationinfo={PrepartionInfo} h={height} w={width} update_color={update_color} get_mix_gradient={get_mix_gradient} setFailure={setFailure}/>
              </div>

              <div className="income-container">
                <IncomeChart preprationinfo={PrepartionInfo} h={height} w={width} update_color={update_color} get_mix_gradient={get_mix_gradient} setFailure={setFailure}/>
              </div>

              <div className="footer">
                <div className="footer-left">
                  <div className="footer-left-75">
                    <p style={{float: 'right', textAlign: 'right', fontSize: '0.75rem'}}>
                    The information provided on this website is for general informational purposes only and does not constitute financial advice.
                    There is no representations or warranties of any kind, express or implied, about the completeness, accuracy, reliability, 
                    suitability, or availability with respect to the website or the information, products, services, or related graphics contained on the website for any purpose. 
                    Any reliance you place on such information is therefore strictly at your own risk.
                    </p>
                  </div>
                </div>
                <div className="footer-right">
                  <div className="footer-right-75">
                    <img src={mySvg} alt="logo" style={{width: '50px', height:' 50px'}}/>
                    <a href="https://www.linkedin.com/in/yuzewang/" style={{marginLeft: '20px'}}>LinkedIn</a>
                    <a href="https://github.com/Yuze-Wang-RoyAnnd" style={{marginLeft: '20px'}}>Github</a>
                    <a href="https://yuze-wang-royannd.github.io/" style={{marginLeft: '20px'}}>Website</a>
                    
                  </div>
                </div>
              </div>
            </div>
          </div>




          </>
        ) : (
          <div/>
        )
      }


    </div>
  )
}

export default App
