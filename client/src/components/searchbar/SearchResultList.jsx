import React from "react";
import "./SearchResultList.css";
import { SearchResult } from "./SearchResult";

export const SearchResultList = ({ results, append_to_info}) => {
  return (
    <div className="results-list">
      {results && results.map((value) => {
        return <SearchResult result={value} key={value.index} append_to_info={append_to_info}/>;
      })}
    </div>
  );
};
