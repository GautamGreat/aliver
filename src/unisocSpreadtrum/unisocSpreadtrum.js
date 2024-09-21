import {Buffer} from "buffer"
import { calcCRC16, calcCRC16Unisoc, bufferForRead, bufferForWrite } from "./unisocSpreadtrumUtils"

class unisocSpreadtrum {
  constructor (usb, showProgress) {
    this.showProgress = showProgress
    this.usb_device = usb
    this.last_error = ""
  }

  async readPacket () {
    let packet = await this.usb_device.read(4096)
    // try reading untill there is enough buffer for spreadtrum packet
    // TODO: Add some sort of timeout here
    while(packet.value.length < 8) { 
      let new_packet = await this.usb_device.read(4096)
      const new_array = new Uint8Array(packet.length + new_packet.length)
      new_array.set(packet.value, 0)
      new_array.set(new_packet.value, packet.value.length)
      packet.value = new_array
    }

    packet = Buffer.from(packet.value)
    return {
      cmd: packet.readUintBE(1, 2),
      buffer: bufferForRead(packet.subarray(5, -3))
    }
  }

  async writePacket (command, crc_type, args) {
    const packet_length = args.length
    // args length = 2, command type = 2, crc = 2
    let buffer = Buffer.alloc(packet_length + 2 + 2 + 2)
    buffer.writeUInt16BE(command, 0)
    buffer.writeUInt16BE(packet_length, 2)
    buffer.set(args, 4)

    if (crc_type === 0) 
      buffer.writeUInt16BE(calcCRC16(0, buffer, 0, buffer.length - 2), 2 + 2 + packet_length)
    else if (crc_type === 1)
      buffer.writeUInt16BE(calcCRC16Unisoc(buffer, 0, buffer.length), 2 + 2 + packet_length)

    buffer = bufferForWrite(buffer)
    let write_packet = Buffer.alloc(buffer.length + 2)
    write_packet.writeUint8(0x7E, 0)
    write_packet.set(buffer, 1)
    write_packet.writeUint8(0x7E, buffer.length + 1)
    return await this.usb_device.write(write_packet)

  }

  async initDevice () {
    let buffer = Buffer.alloc(1)
    buffer.writeUint8(0x7E, 0)
    await this.usb_device.write(buffer)
    let packet = await this.readPacket()
    if(!packet) return false

    if(packet.cmd !== 0x81) {
      this.last_error = "Wrong initialization response from device"
      return false
    }

    return packet.buffer.toString()

  }

  async sendFile (addr, buffer, file_type) {
    let max_packet_size
    let crc_type

    if(file_type === 0) {
      // max packet size for fdl
      max_packet_size = 0x210
      crc_type = 0
      // command 0 is required before writing fdl
      await this.writePacket(0, crc_type, Buffer.alloc(0))
      await this.readPacket()
    } else if (file_type === 1) {
      crc_type = 1
      max_packet_size = 0x800
    } else {
      this.last_error = "Unsupported file type"
      return false
    }

    // write file details packet
    let packet = Buffer.alloc(4 + 4) // 4 byte addr 4 byte length
    packet.writeUInt32BE(addr, 0)
    packet.writeUInt32BE(buffer.length, 4)

    await this.writePacket(1, crc_type, packet)
    let recv_packet = await this.readPacket()
    if(!recv_packet || recv_packet.cmd !== 0x80) {
      this.last_error = "Failed to ack start write data packet"
      return false
    }

    this.showProgress(0, buffer.length)
    let counter = 0
    while (counter !== buffer.length) {
      if (buffer.length - counter >= max_packet_size) {
        let write_data = Buffer.alloc(max_packet_size)
        buffer.copy(write_data, 0, counter)
        await this.writePacket(2, crc_type, write_data)
        counter += max_packet_size
      } else {
        await this.writePacket(2, crc_type, buffer.subarray(counter, buffer.length))
        counter = buffer.length
      }

      recv_packet = await this.readPacket()
      if(!recv_packet || recv_packet.cmd !== 0x80) {
        this.last_error = "Failed to ack write data packet"
        return false
      }
      this.showProgress(counter, buffer.length)
    }

    await this.writePacket(3, crc_type, Buffer.alloc(0))
    recv_packet = await this.readPacket()
    if(!recv_packet || recv_packet.cmd !== 0x80) {
      this.last_error = "Failed to ack write data end packet"
      return false
    }

    if (file_type === 0) {
      // write execute command
      await this.writePacket(4, crc_type, Buffer.alloc(0))
      recv_packet = await this.readPacket()
      if(!recv_packet || recv_packet.cmd !== 0x80) {
        this.last_error = "Failed to ack execute fdl packet"
        return false
      }
    }

    return true
  }

  async eraseDeviceMemory (addr, size) {
    let packet = Buffer.alloc(4 + 4) // 4 byte addr 4 byte length
    packet.writeUInt32BE(addr, 0)
    packet.writeUInt32BE(size, 4)

    await this.writePacket(0xA, 1, packet)
    let recv_packet = await this.readPacket()
    if(!recv_packet || recv_packet.cmd !== 0x80) {
      this.last_error = "Failed to ack erase memory packet"
      return false
    }
    return true
  }

}

export default unisocSpreadtrum