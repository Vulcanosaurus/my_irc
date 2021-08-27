import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import io from "socket.io-client";
const socket = io("localhost:3001");

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [msg, setMsg] = useState("");
  const [gMsg, setGMsg] = useState("");
  const [login, setLogin] = useState(false);
  const [username, setUsername] = useState("");
  const [validUsername, setValidUsername] = useState(false);
  const msgEnd = useRef(null);
  const [currentServer, setCurrentServer] = useState("/");
  const [serverList, setServerList] = useState([]);
  const [inputHistory, setInputHistory] = useState([]);

  useEffect(() => {
    socket.on("connect", () => {
      setIsConnected(true);
    });
    socket.on("userchange", (data) => {
      setUsername(data.nick);
      setGMsg(data.msg);
    });
    socket.on("storeIsClosing", () => {
      socket.emit("msg", "/join /");
    });
    socket.on("disconnect", () => {
      setIsConnected(false);
      setLogin("");
      setUsername("");
      setValidUsername("");
    });
    socket.on("userChange", (nickname) => {
      setUsername(nickname);
    });
    socket.on("smiley", function(smiley){
      console.log(smiley);
    })

    socket.on("privateMessage", ({ content, from }) => {
      for (let i = 0; i < username.length; i++) {
        if (username.userID === from) {
          username.gMsg.push({
            content,
            fromSelf: false,
          });
          if (username !== validUsername) {
            username.gMsg = true;
          }
          break;
        }
      }
    });
    socket.on("server", (serverList) => {
      setServerList(
        serverList.map((val, i) => {
          return (
            <div
              className="server-block"
              key={i}
              onClick={(e) => {
                socket.emit("msg", "/join " + e.target.innerHTML);
              }}
            >
              {val}
            </div>
          );
        })
      );
    });
    socket.on("msg", (msg) => {
      setGMsg(
        msg.map((val, i) => {
          if (val[0] === ">") {
            return (
              <p key={i}>
                {val[0]} {val[1]}
              </p>
            );
          }
          return (
            <p key={i}>
              {val[0]} : {val[1]}
            </p>
          );
        })
      );
      if (msgEnd.current !== null) {
        msgEnd.current.scrollIntoView();
      }
    });
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("msg");
    };
  }, [isConnected, gMsg]);

  const sendMessage = () => {
    if (msg === "") {
      return null;
    }
    socket.emit("msg", msg);
  };

  const sendLogin = (login) => {
    if (isConnected === true) {
      socket.emit("user", login);
      socket.emit("server", currentServer);
    } else {
      setValidUsername("Failed to establish connection...");
    }
  };

  if (!login) {
    return (
      <div className="App">
        <form
          className="App-header"
          onSubmit={() => {
            setLogin(username);
            sendLogin(username);
          }}
        >
          <label htmlFor="login" style={{ margin: "1em" }}>
            Insert your Username:
          </label>
          <input
            style={{ padding: "0.3em" }}
            onChange={(e) => {
              setUsername(e.target.value);
              if (e.target.value !== "") {
                setValidUsername("Press Enter to continue...");
              } else {
                setValidUsername("");
              }
            }}
            autoComplete="off"
            type="text"
            id="login"
            name="login"
          />
          <p style={{ margin: "1em", fontSize: "0.5em" }}>{validUsername}</p>
        </form>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="side-info">
        <div className="user-info">
          <p>Username : {username} </p>
          <p>Connected: {"" + isConnected}</p>
        </div>
        <div className="server-info">{serverList}</div>
      </div>
      <div className="chatroom">
        <div className="chat-log">
          {gMsg}
          <div className="bottom-bot" ref={msgEnd} />
        </div>
        <div className="chat-input">
          <form
            method="POST"
            onKeyPress={(e) => {
              if (e.code === "Enter") {
                e.preventDefault();
                document.querySelector("#msg").value = "";
                setMsg("");
                sendMessage();
              }
            }}
            onKeyDown={(e) => {
              if (e.code === "ArrowUp") {
                // console.log(inputHistory);
                // document.querySelector("#msg").value = inputHistory.pop();
                // setMsg(document.querySelector("#msg").value);
              }
            }}
          >
            <div className="chat-input-bar">
              <input
                onChange={(e) => {
                  setMsg(e.target.value);
                }}
                type="text"
                autoComplete="off"
                name="msg"
                id="msg"
              />
              <button
                style={{ padding: "0.5em", margin: "0.5em" }}
                onClick={(e) => {
                  e.preventDefault();
                  document.querySelector("#msg").value = "";
                  setMsg("");
                  sendMessage();
                }}
              >
                Send!
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  // previous
  /*
  <header className="App-header">
    <div className="room">{gMsg}</div>
  </header>
  */
}

export default App;
