import { Buffer } from "buffer"

const calcCRC16 = (init, data, offset, length) => {
  let j
  for (let i = offset; i < length; i++) {
    j = 0x80
    while (j !== 0) { 
      if ((init & 0x8000) !== 0) {
        init = (init << 1) & 0xFFFF
        init ^= 0x1021
      } else {
        init = (init << 1) & 0xFFFF
      }

      if ((data[i] & j) !== 0) {
        init ^= 0x1021
      }
      j >>= 1
    }
  }
  return init
}

const calcCRC16Unisoc = (data, offset, length) => {
  let crc = 0
  let i = 0
  while (length > 1) {
    crc += (data[offset + i + 1] << 8) | data[offset + i]
    i += 2
    length -= 2
  }

  if (length > 0) {
    crc += data[offset + i + 1]
  }

  crc = (crc >> 16) + (crc & 0xFFFF)
  crc += (crc >> 16)
  crc = ~crc & 0xFFFF
  crc = (crc >> 8) | ((crc & 0xff) << 8)
  return crc

}

const bufferForWrite = (buffer) => {
  let counter = 0
  let i = 0
  for (i = 0; i < buffer.length; i++) {
    if (buffer[i] === 0x7E || buffer[i] === 0x7D)
      counter += 1
  }

  let result = Buffer.alloc(counter + buffer.length)
  counter = 0
  i = 0

  while (counter < result.length) {
    if (buffer[i] === 0x7E || buffer[i] === 0x7D) {
      result[counter] = 0x7D
      counter += 1
      if(buffer[i] === 0x7D)
        result[counter] = 0x5D
      else if (buffer[i] === 0x7E)
        result[counter] = 0x5E
      else
        result[counter] = buffer[i]
    } else {
      result[counter] = buffer[i]
    }
    counter += 1
    i += 1
  }
  return result
}

const bufferForRead = (buffer) => {
  let result = Buffer.alloc(1024 * 1024) // 1 MB is enough
  let counter = 0
  let i = 0

  while (i !== buffer.length) {
    if (buffer[i] === 0x7D) {
      if (buffer[i + 1] === 0x5D) {
        result[counter] = 0x7D
        counter += 2
        i += 2
      } else if (buffer[i + 1] === 0x5E) {
        result[counter] = 0x7E
        counter += 2
        i += 2
      } else {
        result[counter] = 0x7D
        counter += 1
        i += 1
      }
    } else {
      result[counter] = buffer[i]
      counter += 1
      i += 1
    }
  }
  return result.subarray(0, counter - 1)
}

export { calcCRC16, calcCRC16Unisoc, bufferForWrite, bufferForRead}
