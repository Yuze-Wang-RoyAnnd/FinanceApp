import React from 'react'

export const ErrorPage = ({failure}) => {
  return (
    <>
    {
        failure ? (
            <div style={{height: '100vh', width: '100vw', position:'fixed', backgroundColor: 'rgba(0, 0, 0, .7)', margin:'auto', zIndex: '100', display:'flex', alignItems:'center'}}>
                <div style={{margin: 'auto', backgroundColor:'white', height:'50vh', width:'50vw', borderRadius:'20px', display:'flex', alignItems:'center'}}>
                    <p style={{fontSize: '3rem', textAlign:'center'}}> Critical Failure, Refresh Page and try again</p>
                </div>
            </div>
        ): (
            <></>
        )
    }
    </>
  )
}
