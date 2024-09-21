import React from "react";

function ComboBox(props) {
  return (
    <select onChange={props.onChange} className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500">
      {props.options.map((value, index) => <option key={index}>{ value.model }</option>)}
    </select>
  )
}

export default ComboBox


