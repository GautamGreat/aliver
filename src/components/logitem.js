import React from "react";

function LogItem(props) {
  return (
    <span style={{color: props.log.color}}>
      {props.log.newline ? <br/> : ""}
      {props.log.text}
    </span>
  )
}


export default LogItem;