import React, {useEffect,useRef } from 'react';

export const VideoPlayer = ({ user }) => {
    const ref = useRef();

    useEffect(() => {
        user.videoTrack.play(ref.current);
    }, [user.videoTrack]);

    return (
        <div>
            <div ref={ref}
                 style={{width: '1280px', height: '720px'}}
                 />
        </div>
    );
};