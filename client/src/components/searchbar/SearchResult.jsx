import React from 'react'
import "./SearchResult.css"


export const SearchResult = ({ result, append_to_info}) => {
  return (
    <div className='search-result' onClick={() => append_to_info(result)}>{result.ticker} <p className='text'>{result.name}</p></div>
  )
}
