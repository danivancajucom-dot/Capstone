import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import "./my-submitted-schedules.css";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import { db } from "../../firebase";

export default function MySubmittedSchedules() {

    const navigate = useNavigate();

    const [folders,setFolders] = useState({});
    const [loading, setLoading] = useState(true);
    const [expandedSY,setExpandedSY] = useState({});
    const [expandedSem,setExpandedSem] = useState({});

    useEffect(()=>{

        loadSchedules();

    },[]);

    const loadSchedules = async()=>{

        setLoading(true);
        const roomSnapshot = await getDocs(
            collection(db,"rooms")
        );

        const grouped = {};

        for(const roomDoc of roomSnapshot.docs){

            const room = {

                id:roomDoc.id,
                ...roomDoc.data()

            };

            const schedSnapshot = await getDocs(
                collection(db,"rooms",room.id,"schedules")
            );

            const schedules = schedSnapshot.docs
            .map(doc=>({

                id:doc.id,
                ...doc.data()

            }))
            .filter(s=>!s.initialized);

            schedules.forEach(schedule=>{

                const sy = schedule.schoolYear;
                const sem = schedule.semester;

                if(!grouped[sy])
                    grouped[sy]={};

                if(!grouped[sy][sem])
                    grouped[sy][sem]=[];

                const exists =
                    grouped[sy][sem]
                    .find(r=>r.id===room.id);

                if(!exists){

                    grouped[sy][sem].push(room);

                }

            });

        }

        setFolders(grouped);
        setLoading(false);

    };

    const toggleSY=(sy)=>{

        setExpandedSY(prev=>({

            ...prev,

            [sy]:!prev[sy]

        }));

    };

    const toggleSem=(key)=>{

        setExpandedSem(prev=>({

            ...prev,

            [key]:!prev[key]

        }));

    };

    return(

        <div className="lr-submitted-schedules">

            <div className="lr-ss-page-header">

                <h1>
                    My Submitted Schedules
                </h1>

            </div>

            <div className="list-card">

            {   loading ? (
                <div className="room-empty">
                    <i className="fa-solid fa-spinner fa-spin"></i>

                    <h2>Loading Submitted Schedules</h2>

                    <p>Please wait while we retrieve submitted schedules.</p>
                </div>
                ) : Object.keys(folders).length===0 ?(

                    <h3>No submitted schedules.</h3>

                ) : Object.entries(folders).map(

                    ([schoolYear,semesters])=>(

                    <div
                        className="folder-block"
                        key={schoolYear}
                    >

                        <div
                            className="folder-title"
                            onClick={()=>toggleSY(schoolYear)}
                        >

                            <i
                                className={`fa-solid ${
                                    expandedSY[schoolYear]
                                    ?
                                    "fa-folder-open"
                                    :
                                    "fa-folder"
                                }`}
                            ></i>

                            <span>

                                {schoolYear}

                            </span>

                        </div>

                        {

                            expandedSY[schoolYear] &&

                            Object.entries(semesters).map(

                                ([semester,rooms])=>{

                                    const key =
                                    schoolYear+semester;

                                    return(

                                        <div
                                            className="semester-block"
                                            key={semester}
                                        >

                                            <div
                                                className="semester-title"
                                                onClick={()=>toggleSem(key)}
                                            >

                                                <i
                                                    className={`fa-solid ${
                                                        expandedSem[key]
                                                        ?
                                                        "fa-folder-open"
                                                        :
                                                        "fa-folder"
                                                    }`}
                                                ></i>

                                                <span>

                                                    {semester}

                                                </span>

                                            </div>

                                            {

                                                expandedSem[key] &&

                                                rooms.map(room=>(

                                                    <div

                                                        key={room.id}

                                                        className="room-item"

                                                        onClick={()=>{

                                                            navigate(
                                                                "/local-registrar/room-card",
                                                                {

                                                                    state:{

                                                                        room,
                                                                        semester,
                                                                        schoolYear

                                                                    }

                                                                }
                                                            )

                                                        }}

                                                    >

                                                        <i className="fa-solid fa-door-open"></i>

                                                        <span>

                                                            {room.roomName}

                                                        </span>

                                                    </div>

                                                ))

                                            }

                                        </div>

                                    )

                                }

                            )

                        }

                    </div>

                ))

            }

            </div>

        </div>

    )

}