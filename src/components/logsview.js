import React from "react";
import LogItem from "./logitem"

function LogsView(props) {
  return (
    <div>
      {props.list.map((log, index) => <LogItem key={index} log={log}></LogItem>)}
    </div>
  )
}

export default LogsView;