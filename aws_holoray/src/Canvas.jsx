import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';

const Canvas = forwardRef(({ width, height, socket }, ref) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [context, setContext] = useState(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        setContext(ctx);
    }, []);

    useEffect(() => {
        if (context) {
            context.canvas.width = width;
            context.canvas.height = height;
        }
    }, [width, height, context]);

    const getMousePos = (event) => {
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: (event.clientX - rect.left) * (canvasRef.current.width / rect.width),
            y: (event.clientY - rect.top) * (canvasRef.current.height / rect.height) // Corrected typo here
        };
    };

    const handleDrawingCommand = (command) => {
        const x = command.x;
        const y = 720 - (command.y - 275);
        switch (command.type) {
            case 'int_start':
                context.beginPath();
                context.moveTo(x, y);
                break;
            case 'int_draw':
                context.lineTo(x, y);
                console.log("drew in position x:" + command.x + " y:" + command.y)
                context.strokeStyle = 'green';
                context.lineWidth = 2;
                context.stroke();
                break;
            case 'stop':
                context.closePath();
                break;
            default:
                break;
        }
    };

    const startDrawing = (event) => {
        const { x, y } = getMousePos(event);
        context.beginPath();
        context.moveTo(x, y);
        setIsDrawing(true);
        if (socket && socket.readyState == WebSocket.OPEN) {
            socket.send(String(JSON.stringify({ type: 'start', x, y })));
        }
    };

    const draw = (event) => {
        if (!isDrawing) return;
        const { x, y } = getMousePos(event);
        context.lineTo(x, y);
        context.strokeStyle = 'red'; // Set the stroke color
        context.lineWidth = 2; // Set the line width
        context.stroke();
        if (socket && socket.readyState == WebSocket.OPEN) {
            socket.send(String(JSON.stringify({ type: 'draw', x, y })));
        }
    };

    const stopDrawing = () => {
        context.closePath();
        setIsDrawing(false);
        if (socket && socket.readyState == WebSocket.OPEN) {
            socket.send(String(JSON.stringify({ type: 'stop' })));
        }
    };

    const clearCanvas = () => {
        context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    };

    useImperativeHandle(ref, () => ({
        clearCanvas,
    }));

    useImperativeHandle(ref, () => ({
        clearCanvas: () => {
            context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        },
        handleDrawingCommand,
    }));

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            style={{ position: 'absolute', top: 0, left: 0 }}
        />
    );
});

export default Canvas;
