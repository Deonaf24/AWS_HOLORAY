import React, { useState, useRef, useEffect } from "react";
import './App.css';
import Canvas from './Canvas.jsx';

function App() {
    const [videoSocket, setVideoSocket] = useState(null);
    const [socketDrawing, setSocketDrawing] = useState(null);
    const videoRef = useRef(null);
    const [mediaStream, setMediaStream] = useState(null);
    const canvasRef = useRef(null);
    const peerConnectionRef = useRef(null);

    // WebSocket setup
    useEffect(() => {
        const videoWs = new WebSocket('ws://192.168.1.214:8081');
        setVideoSocket(videoWs);

        videoWs.onopen = () => {
            console.log('Connected to WebSocket server on port 8081');
        };

        videoWs.onclose = () => {
            console.log('Disconnected from WebSocket server on port 8081');
        };

        // WebSocket for drawing instructions
        const wsDrawing = new WebSocket('ws://192.168.1.214:8080');
        setSocketDrawing(wsDrawing);

        wsDrawing.onopen = () => {
            console.log('Connected to WebSocket server on port 8080');
        };

        wsDrawing.onmessage = (event) => {
            console.log('Message from server:', event.data);
            const message = JSON.parse(event.data);
            if (canvasRef.current) {
                canvasRef.current.handleDrawingCommand(message);
                console.log('called handleDrawingCommand on:' + message);
            }
        };

        wsDrawing.onclose = () => {
            console.log('Disconnected from WebSocket server on port 8080');
        };

        return () => {
            videoWs.close();
            wsDrawing.close();
        };
    }, []);

    // WebRTC setup
    useEffect(() => {
        const setupWebRTC = async () => {
            try {
                if (!videoSocket) {
                    console.error("WebSocket instance is null");
                    return;
                }

                if (videoSocket.readyState !== WebSocket.OPEN) {
                    console.error("WebSocket is not ready");
                    return;
                }

                const configuration = {
                    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
                };
                peerConnectionRef.current = new RTCPeerConnection(configuration);

                // Gather and send ICE candidates
                peerConnectionRef.current.onicecandidate = event => {
                    if (event.candidate) {
                        videoSocket.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
                        console.log('Sent ICE candidate');
                    }
                };

                // Get user media (camera) and add to connection
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                setMediaStream(stream);

                // Set videoRef to stream
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }

                stream.getTracks().forEach(track => peerConnectionRef.current.addTrack(track, stream));

                // Create SDP offer
                const offer = await peerConnectionRef.current.createOffer();
                await peerConnectionRef.current.setLocalDescription(offer);

                // Send the SDP offer to the WebSocket server
                videoSocket.send(JSON.stringify({ type: 'offer', sdp: offer.sdp }));
                console.log('Sent the SDP offer');

                // Handle incoming SDP answer
                videoSocket.onmessage = async (event) => {
                    try {
                        let data = event.data;
                        if (data instanceof Blob) {
                            data = await data.text();
                        }
                        const message = JSON.parse(data);

                        if (message.type === 'answer' && peerConnectionRef.current) {
                            console.log("Received sdp answer from server.");
                            const remoteDesc = new RTCSessionDescription({ type: 'answer', sdp: message.sdp });
                            await peerConnectionRef.current.setRemoteDescription(remoteDesc);
                        } else if (message.type === 'candidate' && peerConnectionRef.current) {
                            console.log("Received ICE candidate from server.");
                            const candidate = new RTCIceCandidate(message.candidate);
                            await peerConnectionRef.current.addIceCandidate(candidate);
                        }
                    } catch (error) {
                        console.error('Error processing message from WebSocket:', error);
                    }
                };
            } catch (error) {
                console.error('Error accessing media devices or setting up WebRTC:', error);
            }
        };

        // Delay setup until WebSocket is open
        if (videoSocket && videoSocket.readyState === WebSocket.OPEN) {
            setupWebRTC();
        } else if (videoSocket) {
            videoSocket.onopen = () => {
                setupWebRTC();
            };
        }

        return () => {
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
            }
        };
    }, [videoSocket]);

    return (
        <div className="App">
            <header className="App-header">
                <div className="image-container" style={{ position: 'relative', width: '1280px', height: '720px' }}>
                    <video ref={videoRef} autoPlay muted style={{ display: 'block', width: '100%', height: '100%' }} />
                    <video autoPlay="" className="xh8yej3 xt7dq6l x186iv6y" playsInline=""></video>
                    <Canvas ref={canvasRef} width={1280} height={720} socket={socketDrawing}
                            style={{ position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', pointerEvents: 'none' }} />
                </div>
            </header>
        </div>
    );
}

export default App;