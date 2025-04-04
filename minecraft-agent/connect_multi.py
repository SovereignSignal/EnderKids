#!/usr/bin/env python3
"""
Enhanced Minecraft Bedrock Server Connection Script
This script attempts to connect to a Minecraft Bedrock server using multiple ports and protocol versions.
"""

import socket
import struct
import time
import sys
import random
import threading

# Server configuration
SERVER_ADDRESS = "147.135.41.229"
SERVER_PORTS = [25565, 19132]  # Try both the specified port and the default Bedrock port
PLAYER_NAME = "ExplorerBot"

# Raknet protocol constants
RAKNET_PROTOCOL_VERSIONS = [11, 10, 9, 8]  # Try multiple protocol versions
MAGIC = b"\x00\xff\xff\x00\xfe\xfe\xfe\xfe\xfd\xfd\xfd\xfd\x12\x34\x56\x78"
OFFLINE_MESSAGE_DATA_ID = b"\x00\xff\xff\x00\xfe\xfe\xfe\xfe\xfd\xfd\xfd\xfd\x12\x34\x56\x78"

def create_unconnected_ping():
    """Create an unconnected ping packet"""
    packet = b"\x01"  # Unconnected ping
    packet += struct.pack(">Q", int(time.time() * 1000))  # Time
    packet += OFFLINE_MESSAGE_DATA_ID  # Magic
    packet += struct.pack(">Q", 2)  # Client GUID
    return packet

def create_open_connection_request_1(protocol_version):
    """Create an open connection request 1 packet"""
    packet = b"\x05"  # Open connection request 1
    packet += OFFLINE_MESSAGE_DATA_ID  # Magic
    packet += struct.pack(">B", protocol_version)  # Protocol version
    # Padding (MTU size - packet length)
    packet += b"\x00" * (1492 - len(packet))
    return packet

def create_open_connection_request_2(server_address, server_port, mtu_size, client_guid):
    """Create an open connection request 2 packet"""
    packet = b"\x07"  # Open connection request 2
    packet += OFFLINE_MESSAGE_DATA_ID  # Magic
    # Server address
    packet += socket.inet_aton(server_address)
    packet += struct.pack(">H", server_port)  # Server port
    packet += struct.pack(">H", mtu_size)  # MTU size
    packet += struct.pack(">Q", client_guid)  # Client GUID
    return packet

def create_login_packet(player_name):
    """Create a login packet (simplified)"""
    # This is a simplified version and won't actually work with a real server
    # A real implementation would need to handle encryption and authentication
    packet = b"\x8f"  # Login packet ID
    packet += struct.pack(">I", len(player_name))  # Player name length
    packet += player_name.encode('utf-8')  # Player name
    return packet

def send_packet(sock, packet, address):
    """Send a packet to the server"""
    sock.sendto(packet, address)
    print(f"Sent packet: {packet[:10]}... ({len(packet)} bytes)")

def receive_packet(sock, timeout=5):
    """Receive a packet from the server"""
    sock.settimeout(timeout)
    try:
        data, addr = sock.recvfrom(2048)
        print(f"Received packet: {data[:10]}... ({len(data)} bytes) from {addr}")
        return data, addr
    except socket.timeout:
        print("Timeout waiting for response")
        return None, None

def ping_server(port):
    """Ping the server to check if it's online"""
    print(f"Pinging server at {SERVER_ADDRESS}:{port}...")
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    
    # Send unconnected ping
    ping_packet = create_unconnected_ping()
    send_packet(sock, ping_packet, (SERVER_ADDRESS, port))
    
    # Receive pong
    data, addr = receive_packet(sock)
    if data is None:
        print("Server did not respond to ping")
        return False, None
    
    if data[0] == 0x1c:  # Unconnected pong
        print("Server is online!")
        # Parse server info
        time_offset = 1
        time_value = struct.unpack(">Q", data[time_offset:time_offset+8])[0]
        guid_offset = time_offset + 8
        guid = struct.unpack(">Q", data[guid_offset:guid_offset+8])[0]
        
        # Server info string starts after the guid
        info_offset = guid_offset + 8
        info_length = struct.unpack(">H", data[info_offset:info_offset+2])[0]
        info_offset += 2
        
        server_info = {}
        server_info['guid'] = guid
        
        # Try to decode the server info, but handle errors
        try:
            info = data[info_offset:info_offset+info_length].decode('utf-8')
            print(f"Server info: {info}")
            server_info['info'] = info
        except UnicodeDecodeError:
            print(f"Server info: (binary data, could not decode)")
            # Print the raw bytes for debugging
            hex_data = data[info_offset:info_offset+info_length].hex()
            print(f"Raw server info: {hex_data}")
            server_info['raw_info'] = hex_data
            
            # Try to extract version from hex data
            if "312e32312e3731" in hex_data:  # "1.21.71" in hex
                print("Detected server version: 1.21.71")
                server_info['version'] = "1.21.71"
        
        return True, server_info
    else:
        print("Unexpected response from server")
        return False, None

def attempt_connection(port, protocol_version):
    """Attempt to connect to the server"""
    print(f"Attempting to connect to {SERVER_ADDRESS}:{port} with protocol version {protocol_version} as {PLAYER_NAME}...")
    
    # Create socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    server_address = (SERVER_ADDRESS, port)
    
    # Generate client GUID
    client_guid = random.randint(0, 2**64 - 1)
    
    # Step 1: Open Connection Request 1
    print("Step 1: Sending Open Connection Request 1...")
    request1 = create_open_connection_request_1(protocol_version)
    send_packet(sock, request1, server_address)
    
    # Receive Open Connection Reply 1
    data, addr = receive_packet(sock, timeout=3)
    if data is None or data[0] != 0x06:  # Open connection reply 1
        print(f"Failed to receive Open Connection Reply 1 with protocol version {protocol_version}")
        return False
    
    # Parse MTU size
    mtu_size = struct.unpack(">H", data[-2:])[0]
    print(f"Server MTU size: {mtu_size}")
    
    # Step 2: Open Connection Request 2
    print("Step 2: Sending Open Connection Request 2...")
    request2 = create_open_connection_request_2(SERVER_ADDRESS, port, mtu_size, client_guid)
    send_packet(sock, request2, server_address)
    
    # Receive Open Connection Reply 2
    data, addr = receive_packet(sock, timeout=3)
    if data is None or data[0] != 0x08:  # Open connection reply 2
        print("Failed to receive Open Connection Reply 2")
        return False
    
    print("Connection established!")
    
    # Step 3: Login (simplified)
    print("Step 3: Sending login packet...")
    login_packet = create_login_packet(PLAYER_NAME)
    send_packet(sock, login_packet, server_address)
    
    # In a real implementation, we would need to handle the login response,
    # encryption, and authentication. This simplified version won't actually
    # complete the login process with a real server.
    
    # Keep the connection alive for a while
    print("Waiting for responses...")
    try:
        for _ in range(5):
            data, addr = receive_packet(sock, timeout=3)
            if data is None:
                continue
            
            # Process received packets
            packet_id = data[0]
            print(f"Received packet with ID: {packet_id}")
            
            # In a real implementation, we would handle different packet types here
    
    except KeyboardInterrupt:
        print("Connection interrupted by user")
    
    print("Closing connection...")
    sock.close()
    return True

def main():
    """Main function"""
    print("Enhanced Minecraft Bedrock Server Connection Script")
    print("--------------------------------------------------")
    
    # Try pinging the server on different ports
    server_online = False
    server_info = None
    working_port = None
    
    for port in SERVER_PORTS:
        online, info = ping_server(port)
        if online:
            server_online = True
            server_info = info
            working_port = port
            break
    
    if not server_online:
        print("Could not ping server on any port. Exiting.")
        return
    
    # Try connecting with different protocol versions
    for port in [working_port] if working_port else SERVER_PORTS:
        for protocol_version in RAKNET_PROTOCOL_VERSIONS:
            print(f"\nTrying port {port} with protocol version {protocol_version}...")
            if attempt_connection(port, protocol_version):
                print(f"Successfully connected to {SERVER_ADDRESS}:{port} with protocol version {protocol_version}!")
                return
    
    print("\nFailed to connect to the server with any combination of ports and protocol versions.")
    print("The server might be blocking connections from unauthorized clients or using a different protocol.")

if __name__ == "__main__":
    main()
