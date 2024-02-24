import React, { useState } from "react";
import { myconfig } from "../../assets/config";
import { FaSearch } from "react-icons/fa";
import "./SearchBar.css";
import axios from "axios"

export const SearchBar = ({setResults}) => {
  const [Input, setInput] = useState("");

  const fetchData = (value) => {
    if (value !== ''){
    axios.get(`${myconfig.linktoBackend}/api/get_company_list?input_msg=` + value).then(response => response.data)
      .then((data) => {
        const result = [];
        Object.keys(data).forEach(key => result.push(data[key]));
        setResults(result);
      });
    }else{
      setResults('');
    }
  };

  const handleChange = (value) => {
    setInput(value);
    fetchData(value);
  };
  return (
    <div className="input-Wrapper ">
      <FaSearch id="search-icon" />
      <input
        placeholder="Type Ticker or Name to get started..."
        value={Input}
        onChange={(e) => handleChange(e.target.value)}
      />
    </div>
  );
};
