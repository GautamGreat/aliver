import { useState } from "react";
import ComboBox from "./components/combobox"
import LogsView from "./components/logsview";
import Usb from "./webUsbLib/usb";
import unisocSpreadtrum from "./unisocSpreadtrum/unisocSpreadtrum";
import Supported_Models from "./models/supportedModels";
import { Buffer } from "buffer";

const elapsedTimeToString = (elapsedMs) => {
  let hours = Math.floor((elapsedMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  let minutes = Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60))
  let seconds = Math.floor((elapsedMs % (1000 * 60)) / 1000)

  let ret_val = "";
  if(hours > 0) {
    ret_val += hours.toString() + " hour "
  }

  if(minutes > 0) {
    if(minutes === 1) {
      ret_val += minutes.toString() + " minute "
    } else {
      ret_val += minutes.toString() + " minutes "
    }
  }

  if(seconds > 0) {
    if(seconds === 1){
      ret_val += seconds.toString() + " second "
    } else {
      ret_val += seconds.toString() + " seconds "
    }
  }

  return ret_val
}


function App() {
  let logs_array = [{}]
  const [logs, updateLogs] = useState([{}])
  const [isButtonEnabled, setButtonState] = useState(true)
  const [modelIndex, setModelIndex] = useState(0)
  const [percentage, setPercentage] = useState(0)
  const [models] = useState(Supported_Models)

  const showProgress = (current, total) => {
    let perc = Math.round(current * 100 / total)
    setPercentage(perc)
  }

  const addTolog = (str, color="black", newline=true) => {
    logs_array = ([...logs_array, {
      text: str,
      color: color,
      newline: newline
    }])
    updateLogs(logs_array)
  }

  const flash_device = async () => {
    logs_array = [{}]
    addTolog("Connecting to device... ", "black", false)

    const model_ob = Supported_Models[modelIndex]
    let usb = new Usb({vendorId: 0x1782, productId: 0x4D00})
    if(!await usb.requestDevice()) {
      addTolog("Fail", "red", false)
      addTolog(usb.last_error, "red")
      return
    }

    if(!await usb.connect()) {
      addTolog("Fail", "red", false)
      addTolog(usb.last_error, "red")
      return
    }

    setButtonState(false)
    showProgress(0, 100)
    let start_time = new Date()
    try {
      let unisocLib = new unisocSpreadtrum(usb, showProgress)
      let connection_response = await unisocLib.initDevice()
      if(!connection_response) {
        addTolog("Fail", "red", false)
        addTolog(unisocLib.last_error, "red")
        return
      }

      addTolog(`Ok (${connection_response})`, "green", false)
      addTolog("Downloading FDL... ")
      let fileOb = await model_ob.get_file("nor_fdl.bin", showProgress)
      if(!fileOb) {
        addTolog("Fail", "red", false)
        addTolog(model_ob.last_error, "red")
        return
      }

      addTolog("Ok", "green", false)
      addTolog("Flashing FDL... ")
      if(!await unisocLib.sendFile(0x34000000, fileOb, 0)) {
        addTolog("Fail", "red", false)
        addTolog(unisocLib.last_error, "red")
        return
      }

      addTolog("Ok", "green", false)
      connection_response = await unisocLib.initDevice()
      if(!connection_response) {
        addTolog("Fail", "red", false)
        addTolog(unisocLib.last_error, "red")
        return
      }

      await unisocLib.writePacket(0, 1, Buffer.alloc(0))
      await unisocLib.readPacket()

      addTolog(connection_response, "green")
      addTolog("Downloading SSBOOT... ")
      fileOb = await model_ob.get_file("ssboot.bin", showProgress)
      if(!fileOb) {
        addTolog("Fail", "red", false)
        addTolog(model_ob.last_error, "red")
        return
      }

      addTolog("Ok", "green", false)
      addTolog("Flashing SSBOOT... ")
      if(!await unisocLib.sendFile(0x80000000, fileOb, 1)) {
        addTolog("Fail", "red", false)
        addTolog(unisocLib.last_error, "red")
        return
      }

      addTolog("Ok", "green", false)

      addTolog("Downloading PS... ")
      fileOb = await model_ob.get_file("ps.bin", showProgress)
      if(!fileOb) {
        addTolog("Fail", "red", false)
        addTolog(model_ob.last_error, "red")
        return
      }

      addTolog("Ok", "green", false)
      addTolog("Flashing PS... ")
      if(!await unisocLib.sendFile(0x80000003, fileOb, 1)) {
        addTolog("Fail", "red", false)
        addTolog(unisocLib.last_error, "red")
        return
      }
      addTolog("Ok", "green", false)

      addTolog("Downloading CSC... ")
      fileOb = await model_ob.get_file("csc.bin", showProgress)
      if(!fileOb) {
        addTolog("Fail", "red", false)
        addTolog(model_ob.last_error, "red")
        return
      }

      addTolog("Ok", "green", false)
      addTolog("Flashing CSC... ")
      if(!await unisocLib.sendFile(0x90000009, fileOb, 1)) {
        addTolog("Fail", "red", false)
        addTolog(unisocLib.last_error, "red")
        return
      }
      addTolog("Ok", "green", false)

      addTolog("Erasing FLASH... ")
      if(!await unisocLib.eraseDeviceMemory(0x90000003, 0xC0000)) {
        addTolog("Fail", "red", false)
        addTolog(unisocLib.last_error, "red")
        return
      }
      addTolog("Ok", "green", false)
      addTolog("Rebooting device... ")
      unisocLib.writePacket(5, 1, Buffer.alloc(0))
      addTolog("Ok", "green", false)
      addTolog("")
      let elapsedTime = new Date() - start_time
      addTolog("All Done")
      addTolog("Elapsed Time: " + elapsedTimeToString(elapsedTime), "blue")

    } finally {
      setButtonState(true)
      usb.disconnect()
    }

  }

  return (
    <section className="bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col items-center justify-center px-6 py-10 mx-auto md:h-screen lg:py-0">
        <div className="w-full bg-white rounded-lg shadow dark:border md:mt-0 sm:max-w-md xl:p-0 dark:bg-gray-800 dark:border-gray-700">
          <div className="p-6 space-y-4 md:space-y-6 sm:p-8">
            <div>
              <h1 className="text-center text-xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white">Aliver</h1>
              <h5 className="text-center mt-1 text-sm font-medium text-gray-900 dark:text-white">Samsung Feature Phone Flash Tool</h5>
            </div>
            <div>
              <label className="mb-1 px-1 block text-sm font-medium text-gray-900 dark:text-white">Phone Model</label>
              <ComboBox options={models} onChange={event => setModelIndex(event.target.selectedIndex)}></ComboBox>
              <button
                type="button"
                onClick={flash_device}
                className= {!isButtonEnabled ? "mt-2 w-full rounded-lg bg-blue-700 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 opacity-50 cursor-not-allowed" : "mt-2 w-full rounded-lg bg-blue-700 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"}
                disabled={!isButtonEnabled}>
                  Flash Device
              </button>
              <div id="message" className="mt-2 mb-0 block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500" style={{height: "20rem"}}>
                <LogsView list={logs}></LogsView>
              </div>
              <div className="mb-0 mt-2 flex w-full h-4 bg-gray-200 rounded-full overflow-hidden dark:bg-neutral-700" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                <div className="flex flex-col justify-center rounded-full overflow-hidden bg-blue-600 text-xs text-white text-center whitespace-nowrap dark:bg-blue-500 transition duration-500" style={{width: `${percentage}%`}}>{percentage}%</div>
              </div>
            </div>
            <h5 className="text-center mt-1 text-sm font-medium text-gray-900 dark:text-white">Developed by <a target="blank" className="text-blue-500" href="https://www.facebook.com/og.gautamgreat">GautamGreat</a></h5>
          </div>
        </div>
      </div>
    </section>
  )
}

export default App;
