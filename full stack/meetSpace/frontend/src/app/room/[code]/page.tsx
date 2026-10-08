"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { API, api, getToken } from "@/lib/api";

type Peer = { name: string; stream: MediaStream };
type Seg = { a: number; b: number; x: number; y: number; c: string; w: number };
type Msg = { name: string; body: string };
type FileMeta = {
  id: string;
  filename: string;
  size_bytes: number;
  by?: string;
};
type Signal = {
  from: string;
  name: string;
  data: { sdp?: RTCSessionDescriptionInit; ice?: RTCIceCandidateInit };
};
type JoinRes = {
  error?: string;
  peers: { id: string; name: string }[];
  board: Seg[];
  messages: Msg[];
  files: FileMeta[];
};

function Video({
  stream,
  label,
  muted,
}: {
  stream: MediaStream | null;
  label: string;
  muted?: boolean;
}) {
  const r = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (r.current) r.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="tile">
      <video ref={r} autoPlay playsInline muted={muted} />
      <span>{label}</span>
    </div>
  );
}

export default function Room() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [peers, setPeers] = useState<Record<string, Peer>>({});
  const [mine, setMine] = useState<MediaStream | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [files, setFiles] = useState<FileMedia[]>([]);
  const [text, setText] = useState("");
  const [tab, setTab] = useState<"v" | "b">("v");
  const [err, setErr] = useState("");
  const sock = useRef<Socket | null>(null);
  const local = useRef<MediaStream | null>(null);
  const pcs = useRef<Record<string, RTCPeerConnection>>({});
  const cv = useRef<HTMLCanvasElement>(null);
  const last = useRef<[number, number] | null>(null);
  const color = useRef<HTMLInputElement>(null);
  const eraser = useRef<HTMLInputElement>(null);

  const draw = (s: Seg) => {
    const c = cv.current;
    const x = c?.getContext("2d");
    if (!c || !x) return;
    x.strokeStyle = s.c;
    x.lineWidth = s.w;
    x.lineCap = "round";
    x.beginPath();
    x.moveTo(s.a * c.width, s.b * c.height);
    x.lineTo(s.x * c.width, s.y * c.height);
    x.stroke();
  };

  const wipe = (emit: boolean) => {
    const c = cv.current;
    const x = c?.getContext("2d");
    if (!c || !x) return;
    x.fillStyle = "#fff";
    x.fillRect(0, 0, c.width, c.height);
    if (emit) sock.current?.emit("clear");
  };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/");
      return;
    }

    let dead = false;
    wipe(false);
    (async () => {
      try {
        const { iceServers } = await api<{ iceServers: RTCIceServer[] }>(
          "/api/config",
        );
        let ms: MediaStream;
        try {
          ms = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
        } catch {
          ms = new MediaStream();
        }
        if (dead) {
          ms.getTracks().forEach((t) => t.stop());
          return;
        }
        local.current = ms;
        setMine(ms);
        const s = io(API, { auth: { token } });
        Socket.current = s;
        s.on("connect_error", () => {
          localStorage.clear();
          router.replace("/");
        });

        const make = (id: string, name: string) => {
          const pc = new RTCPeerConnection({ iceServers });
          pcs.current[id] = pc;
          ms.getTracks().forEach((t) => pc.addTrack(t, ms));
          if (!ms.getTracks().length) {
            pc.addTransceiver("audio", { direction: "recvonly" });
            pc.addTransceiver("video", { direction: "recvonly" });
          }

          pc.onicecandidate = (e) => {
            if (e.candidate)
              s.emit("signal", {
                to: id,
                data: { ice: e.candidate },
              });
          };
          pc.ontrack = (e) =>
            setPeers((p) => ({ ...p, [id]: { name, stream: e.streams[0] } }));
          return pc;
        };

        s.on("signal", async ({ from, name, data }: Signal) => {
          const pc = pcs.current[from] ?? make(from, name);
          if (data.sdp) {
            await pc.setRemoteDescription(data.sdp);
            if (data.sdp.type === "offer") {
              await pc.setLocalDescription(await pc.createAnswer());
              s.emit("signal", {
                to: from,
                data: { sdp: pc.localDescription },
              });
            }
          } else if (data.ice) pc.addIceCandidate(data.ice).catch(() => {});
        });

        s.on("peer-left", (id: string) => {
          pcs.current[id]?.close();
          delete pcs.current[id];
          setPeers((p) => {
            const n = { ...p };
            delete n[id];
            return n;
          });
        });

        s.on("chat", (m: Msg) => setMsgs((x) => [...x, m]));
        s.on("file", (f: FileMeta) => setFiles((x) => [...x, f]));
        s.on("draw", draw);
        s.on("clear", () => wipe(false));

        s.emit("join", code, (res: JoinRes) => {
          if (res.error) {
            setErr(res.error);
            return;
          }
          res.peers.forEach((p) => {
            const pc = make(p.id, p.name);
            pc.onnegotiationneeded = async () => {
              await pc.setLocalDescription(await pc.createOffer());
              s.emit("signal", {
                to: p.id,
                data: { sdp: pc.localDescription },
              });
            };
          });

          setMsgs(res.messages);
          setFiles(res.files);
          res.board.forEach(draw);
        });
      } catch (e) {
        setErr((e as Error).message);
      }
    })();

    return () => {
      dead = true;
      sock.current?.disconnect();
      Object.values(pcs.current).forEach((pc) => pc.close());
      pcs.current = {};
      local.current?.getTracks().forEach((t) => t.stop());
    };

    // eslint-disable-next-line
  }, [code]);

  const toggle = (kind: "audio" | "video") =>
    local.current
      ?.getTracks()
      .filter((t) => t.kind === kind)
      .forEach((t) => (t.enabled = !t.enabled));

  async function share() {
    try {
      const d = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const t = d.getvideoTracks()[0];
      const cam = local.current?.getVideoTracks()[0];
      const swap = (x: MediaStreamTrack) => {
        Object.values(pcs.current).forEach((pc) =>
          pc
            .getSenders()
            .find((z) => z.track?.kind === "video")
            ?.replaceTrack(x),
        );
        setMine(
          new MediaStream([x, ...(local.current?.getAudioTracks() ?? [])]),
        );
      };

      swap(t);
      t.onended = () => {
        if (cam) swap(cam);
      };
    } catch {
      /* user cancelled */
    }
  }

  async function upload(file?: File) {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch(`${API}/api/rooms/${code}/files`, {
      method: "POST",
      headers: { Authorization: "Bearer " + getToken() },
      body: fd,
    });

    if (!r.ok) alert("Upload failed (max 25 MB)");
  }

  async function download(f: FileMeta) {
    const r = await fetch(`${API}/api/files/${f.id}`, {
      headers: { Authorization: "Bearer " + getToken() },
    });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(await r.blob());
    a.download = f.filename;
    a.click();
  }

  const send = () => {
    if (text.trim()) sock.current?.emit("chat", text.trim());
    setText("");
  };

  const pos = (e: React.PointerEvent): [number, number] => {
    const r = cv.current!.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  };

  const onMove = (e: React.PointerEvent) => {
    if (!last.current) return;
    const p = pos(e);
    const er = eraser.current?.checked;
    const s: Seg = {
      a: last.current[0],
      b: last.current[1],
      x: p[0],
      y: p[1],
      c: er ? "#fff" : (color.current?.value ?? "#000"),
      w: er ? 20 : 3,
    };
    draw(s);
    sock.current?.emit("draw", s);
    last.current = p;
  };

  if (err)
    return (
      <div className="center">
        <p className="err">{err}</p>
        <button onClick={() => router.push("/")}>Back</button>
      </div>
    );

  return (
    <div className="room">
      <header>
        <b>Room: {code}</b>
        <button onClick={() => navigator.clipboard.writeText(code)}>
          Copy code
        </button>
        <span className="sp" />
        <button onClick={() => setTab("v")}>Video</button>
        <button onClick={() => setTab("b")}>Whiteboard</button>
        <button onClick={() => toggle("audio")}>Mic</button>
        <button onClick={() => toggle("video")}>Camera</button>
        <button onClick={share}>Share screen</button>
        <button className="r" onClick={() => router.push("/")}>
          Leave
        </button>
      </header>
      <main>
        <div
          className="videos"
          style={{ display: tab === "v" ? "grid" : "none" }}
        >
          <Video stream={mine} label="You" muted />
          {Object.entries(peers).map(([id, p]) => (
            <Video key={id} stream={p.stream} label={p.name} />
          ))}
        </div>
        <div style={{ display: tab === "b" ? "block" : "none" }}>
          <div className="row" style={{ marginBottom: 8 }}>
            <input
              ref={color}
              type="color"
              defaultValue="#1a1a1a"
              style={{ padding: 2, width: 44 }}
            />
            <label>
              <input ref={eraser} type="checkbox" /> Eraser
            </label>
            <button onClick={() => wipe(true)}>Clear</button>
          </div>
          <canvas
            ref={cv}
            width={1000}
            height={600}
            onPointerDown={(e) => {
              last.current = pos(e);
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={onMove}
            onPointerUp={() => (last.current = null)}
            onPointerLeave={() => (last.current = null)}
          />
        </div>
      </main>
      <aside>
        <div className="pane">
          <b>Chat</b>
          <div className="list">
            {msgs.map((m, i) => (
              <div className="m" key={i}>
                <b>{m.name}: </b>
                {m.body}
              </div>
            ))}
          </div>
          <div className="row">
            <input
              type="text"
              placeholder="Message"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
            <button onClick={send}>Send</button>
          </div>
        </div>
        <div className="pane" style={{ borderTop: "1px solid var(--line)" }}>
          <b>Files</b>
          <div className="list f">
            {files.map((f) => (
              <a className="link" key={f.id} onClick={() => download(f)}>
                {f.filename} ({Math.ceil(f.size_bytes / 1024)} KB, {f.by ?? "?"}
                )
              </a>
            ))}
          </div>
          <input
            type="file"
            onChange={(e) => {
              upload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      </aside>
    </div>
  );
}
