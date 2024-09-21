import axios from "axios"
import { Buffer } from "buffer"
import Pako from "pako"

class SamsungModel {
  constructor (model) {
    this._model = model
    this.last_error = ""
    this.file_base = axios.create({baseURL: ""})
  }

  async get_file(filename, showProgress) {
    try {
      const file_response = await this.file_base.get(
        `/aliver/files/${this.model}/${filename}`, {
          responseType: "blob",
          onDownloadProgress: (progressEvent) => {
            showProgress(progressEvent.loaded, progressEvent.total)
          }
        }
      )
      return Buffer.from(Pako.ungzip(await file_response.data.arrayBuffer()))
    } catch (e) {
      this.last_error = e.message
    }
    return false
  }

  get model () {
    return this._model
  }
}

const Supported_Models = [
  new SamsungModel("E1200Y"),
  new SamsungModel("E1207Y"),
  new SamsungModel("B110E"),
  new SamsungModel("B310E"),
  new SamsungModel("B313E")
]
export default Supported_Models;
