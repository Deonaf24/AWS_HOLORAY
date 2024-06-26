import React, {useEffect, useState, useRef} from "react";
import AgoraRTC from 'agora-rtc-sdk-ng';
import { VideoPlayer } from "./VideoPlayer.jsx";

//things necessary for the agora video feed
const APP_ID = 'bd99dc0324944f27a9793a7decb5e4da';
const TOKEN = '007eJxTYFgnZX1vNr96yMnrmfdrOTbM04tQrPy2f/KP025bIw/tXVCvwJCUYmmZkmxgbGRiaWKSZmSeaGluaZxonpKanGSaapKSGLQ5M60hkJGBnfEdMyMDBIL4rAxlmSmp+QwMAL+MIN4=';
const CHANNEL = 'video';

//Create the Agora client
const client = AgoraRTC.createClient({
    mode: 'rtc',
    codec: 'vp8',
});

//Main Component (arrow function which takes onVideoTrack
export const VideoRoom = ({ onVideoTrack }) => {
    //users starts as an empty array
    const [users, setUsers] = useState([]);
    //videoTrack starts null
    const [videoTrack, setVideoTrack] = useState(null);
    //videoContainerRef starts null
    const videoContainerRef = useRef(null);

    //useEffect that happens when onVideoTrack is changed
    useEffect ( () => {

        //define handleUserJoined and handleUserLeft
        const handleUserJoined = async (user, mediaType) => {
            await client.subscribe(user, mediaType);
            if (mediaType === 'video') {
                setUsers((previousUsers) => [...previousUsers, user]);
            }
        };

        const handleUserLeft = (user) => {
            setUsers ((previousUsers) =>
                previousUsers.filter((u) => u.uid !== user.uid)
            );
        };

        //in the event where a user joined call handleUserJoined
        client.on('user-published', handleUserJoined);
        //in the event a user left, call handleUserLeft
        client.on('user-left', handleUserLeft);

        //join the Agora room
        client.join(APP_ID, CHANNEL, TOKEN, null)
            .then((uid) =>
                //for all the joined users retrieve the uid and cameraTrack ad an array
                Promise.all([
                    AgoraRTC.createCameraVideoTrack(),
                    uid,
                ])
            )
            .then(([track, uid]) => {
                const videoTrack = track;
                setUsers((previousUsers) => [
                    ...previousUsers,
                    {
                        uid,
                        videoTrack: track,
                    },
                ]);
                //set the video track to the camera
                client.publish(track);

                if(videoContainerRef.current){
                    track.play(videoContainerRef.current);
                }
            })
            .catch(error => {
                console.error('error joining or publishing', error);
            });

        //Clean up on unmount or dependencies change
        return () => {
            client.off('user-published', handleUserJoined);
            client.off('user-left', handleUserLeft);
        };
    }, [onVideoTrack]);



    return (
        <div>
            <div ref={videoContainerRef} style={{width: '640px', height: '360px', display: 'none' }}></div>
            {users.map((user) => (
                <VideoPlayer key={user.uid} user={user} />
            ))}
        </div>
    );
};
