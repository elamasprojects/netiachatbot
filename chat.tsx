import * as React from "react"
import { motion } from "framer-motion"
import { addPropertyControls, ControlType } from "framer"
import { Send, Mic } from "lucide-react"

type Msg = {
    id: string
    content: string
    sender: "user" | "bot"
    timestamp: number
    status?: "sending" | "sent" | "error"
}

export default function EmbedChat({
    webhookUrl,
    title,
    description,
}: {
    webhookUrl: string
    title: string
    description: string
}) {
    interface TextShimmerProps {
        children: string
        as?: React.ElementType
        className?: string
        duration?: number
        spread?: number
    }

    const TextShimmer: React.FC<TextShimmerProps> = ({
        children,
        as: Component = "span",
        className,
        duration = 2,
        spread = 2,
    }) => {
        const MotionComponent: any = motion(Component as any)
        const dynamicSpread = React.useMemo(() => {
            return (children?.length || 0) * spread
        }, [children, spread])

        const baseColor = "#a1a1aa"
        const baseGradientColor = "#000"

        return (
            <MotionComponent
                className={className}
                initial={{ backgroundPosition: "100% center" }}
                animate={{ backgroundPosition: "0% center" }}
                transition={{ repeat: Infinity, duration, ease: "linear" }}
                style={{
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                    backgroundRepeat: "no-repeat, padding-box",
                    backgroundSize: "250% 100%, auto",
                    backgroundImage: `linear-gradient(90deg, #0000 calc(50% - ${dynamicSpread}px), ${baseGradientColor}, #0000 calc(50% + ${dynamicSpread}px)), linear-gradient(${baseColor}, ${baseColor})`,
                } as React.CSSProperties}
            >
                {children}
            </MotionComponent>
        )
    }
    const [convId] = React.useState(
        () => `conv_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    )
    const [messages, setMessages] = React.useState<Msg[]>([
        {
            id: "1",
            content:
                "Hola! Soy tu coach deportivo de Netia. En qué puedo ayudarte hoy?",
            sender: "bot",
            timestamp: Date.now(),
        },
    ])
    const [input, setInput] = React.useState("")
    const [loading, setLoading] = React.useState(false)
    const endRef = React.useRef<HTMLDivElement>(null)
    const listRef = React.useRef<HTMLDivElement>(null)
    const isNearBottomRef = React.useRef(true)
    const lastAutoScrollAtRef = React.useRef(0)

    const [typing, setTyping] = React.useState(false) // para el indicador "escribiendo..."

    const [recording, setRecording] = React.useState(false) // para el micrófono
    const mediaRecorderRef = React.useRef<MediaRecorder | null>(null)
    const chunksRef = React.useRef<BlobPart[]>([])
    const recordStartRef = React.useRef<number | null>(null)
    // Tipos para el nuevo input
    // attachments removed

    interface AIInputFieldProps {
        onSubmit: (message: string) => void
        onToggleRecord: () => void
        isRecording: boolean
        disabled?: boolean
    }

    const AIInputField: React.FC<AIInputFieldProps> = ({ onSubmit, onToggleRecord, isRecording, disabled }) => {
        const [message, setMessage] = React.useState("")
        const [isFocused, setIsFocused] = React.useState(false)
        const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)

        React.useEffect(() => {
            if (textareaRef.current) {
                textareaRef.current.style.height = "auto"
                textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px"
            }
        }, [message])

        function handleSubmit() {
            if (disabled) return
            if (message.trim()) {
                onSubmit(message.trim())
                setMessage("")
            }
        }

        function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
            }
        }

        return (
            <div className="w-full max-w-4xl mx-auto p-0">
                <div className={`relative transition-all duration-500 ease-out ${isFocused || message ? "transform scale-105" : ""}`}>
                    <div className={`absolute inset-0 rounded-3xl transition-all duration-500 ${isFocused ? "bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-xl scale-110" : "bg-gradient-to-r from-slate-200/50 via-slate-100/50 to-slate-200/50 blur-lg"}`}></div>
                    <div className={`relative backdrop-blur-xl bg-white/80 border-2 rounded-3xl transition-all duration-300 ${isFocused ? "border-blue-400/50 shadow-2xl shadow-blue-500/25" : "border-white/60 shadow-xl shadow-slate-300/25"} hover:shadow-2xl hover:shadow-slate-400/30`} style={{ borderRadius: 24, background: "rgba(255,255,255,0.9)", border: "2px solid rgba(226,232,240,0.9)", boxShadow: isFocused ? "0 12px 30px rgba(59,130,246,0.25)" : "0 10px 24px rgba(100,116,139,0.25)" }}>
                        
                        {/* Layout principal: Audio | Textarea | Send */}
                        <div className="flex items-center p-4 gap-3" style={{ display: "flex", alignItems: "center", padding: "16px", gap: 12 }}>
                            
                            {/* Botón de Audio - Izquierda */}
                            <button 
                                onClick={onToggleRecord} 
                                className={`group relative p-3 rounded-2xl transition-all duration-300 hover:scale-110 ${isRecording ? "bg-gradient-to-br from-red-100/80 to-pink-100/80 animate-pulse shadow-lg shadow-red-300/50" : "bg-gradient-to-br from-slate-100/80 to-white/80 hover:from-orange-100/80 hover:to-orange-200/80 hover:shadow-lg"}`} 
                                title={isRecording ? "Stop recording" : "Voice input"} 
                                style={{ 
                                    padding: 10, 
                                    borderRadius: 14, 
                                    border: isRecording ? "1px solid #fecaca" : "1px solid #e2e8f0", 
                                    background: isRecording ? "linear-gradient(180deg,#fee2e2,#fff1f2)" : "linear-gradient(180deg,#f8fafc,#ffffff)", 
                                    cursor: "pointer",
                                    flexShrink: 0
                                }}
                            >
                                <Mic className={`w-5 h-5 transition-colors duration-300 ${isRecording ? "text-red-600" : "text-orange-500 group-hover:text-orange-600"}`} />
                                <div className={`absolute inset-0 rounded-2xl transition-all duration-300 ${isRecording ? "bg-gradient-to-br from-red-400/20 to-pink-400/20" : "bg-gradient-to-br from-orange-400/0 to-orange-500/0 group-hover:from-orange-400/20 group-hover:to-orange-500/20"}`}></div>
                            </button>

                            {/* Textarea - Centro */}
                            <div className="flex-1 relative" style={{ position: "relative", flex: 1 }}>
                                <textarea 
                                    ref={textareaRef} 
                                    value={message} 
                                    onChange={(e) => setMessage(e.target.value)} 
                                    onKeyDown={handleKeyDown} 
                                    onFocus={() => setIsFocused(true)} 
                                    onBlur={() => setIsFocused(false)} 
                                    placeholder="Preguntame lo que quieras.." 
                                    className="w-full resize-none border-none outline-none text-slate-800 placeholder-slate-400 text-lg leading-relaxed min-h-[32px] max-h-32 bg-transparent font-medium selection:bg-blue-200/50" 
                                    rows={1} 
                                    style={{ 
                                        background: "transparent", 
                                        width: "100%", 
                                        resize: "none", 
                                        border: "none", 
                                        outline: "none", 
                                        color: "#0f172a", 
                                        fontSize: 16, 
                                        lineHeight: 1.6, 
                                        minHeight: 32, 
                                        maxHeight: 120, 
                                        fontWeight: 500,
                                        padding: "8px 0"
                                    }} 
                                />
                                {isFocused && !message && (
                                    <div className="absolute top-1 left-0 w-0.5 h-8 bg-gradient-to-b from-blue-500 to-purple-500 animate-pulse rounded-full"></div>
                                )}
                            </div>

                            {/* Botón de Enviar - Derecha */}
                            <button 
                                onClick={handleSubmit} 
                                disabled={disabled || !message.trim()} 
                                className={`group relative p-4 rounded-2xl font-medium transition-all duration-300 ${message.trim() ? "bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-xl shadow-orange-500/40 hover:shadow-2xl hover:shadow-orange-500/50 hover:scale-110 transform-gpu" : "bg-gradient-to-br from-slate-200/80 to-slate-300/80 text-slate-400 cursor-not-allowed"}`} 
                                title="Send message" 
                                style={{ 
                                    padding: 10, 
                                    borderRadius: 12, 
                                    border: "none", 
                                    cursor: disabled || !message.trim() ? "not-allowed" : "pointer", 
                                    background: message.trim() ? "linear-gradient(135deg,#FF7A00,#FF8C1A)" : "linear-gradient(180deg,#e5e7eb,#f3f4f6)", 
                                    color: message.trim() ? "#fff" : "#9ca3af", 
                                    boxShadow: message.trim() ? "0 10px 24px rgba(255,122,0,0.4)" : "none", 
                                    height: 40, 
                                    display: "flex", 
                                    alignItems: "center", 
                                    justifyContent: "center",
                                    flexShrink: 0
                                }}
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>

                    </div>

                    {isRecording && (
                        <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2">
                            <div className="flex items-center gap-3 bg-gradient-to-r from-red-500/90 to-pink-500/90 backdrop-blur-xl text-white px-6 py-3 rounded-2xl shadow-2xl shadow-red-500/50">
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                                    <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                                </div>
                                <span className="font-medium">Listening...</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    async function sendMessage(text: string) {
        if (!text.trim() || loading) return

        const id = String(Date.now())

        setMessages((m) => [
            ...m,
            {
                id,
                content: text.trim(),
                sender: "user",
                timestamp: Date.now(),
                status: "sending",
            },
        ])

        setLoading(true)
        setTyping(true)

        try {
            const replies = await sendToWebhook(text.trim())
            setMessages((m) => m.map((x) => (x.id === id ? { ...x, status: "sent" } : x)))
            const list = replies.length ? replies : ["No recibí respuesta del webhook."]
            for (const msg of list) {
                await delay(300)
                setMessages((m) => [
                    ...m,
                    {
                        id: String(Date.now()) + Math.random().toString(36).slice(2, 6),
                        content: String(msg),
                        sender: "bot",
                        timestamp: Date.now(),
                    },
                ])
                await delay(150)
            }
        } catch {
            setMessages((m) =>
                m
                    .map((x) => (x.id === id ? { ...x, status: "error" } : x))
                    .concat([
                        {
                            id: id + "e",
                            content: "Error al conectar con el webhook.",
                            sender: "bot",
                            timestamp: Date.now(),
                        },
                    ])
            )
        } finally {
            setTyping(false)
            setLoading(false)
        }
    }

    // Paleta clara con acentos naranja/azul
    const colors = {
        primary: "#FF7A00",
        primaryHover: "#FF8C1A",
        primarySoft: "rgba(255,122,0,0.12)",
        blue: "#1F4F99",
        bg: "#F7F8FC",
        surface: "#FFFFFF",
        text: "#1A1F36",
        muted: "#6B7280",
        border: "#E6E9F0",
    }

    // Reemplazado por TextShimmer

    React.useEffect(() => {
        // Sin auto-scroll al recibir mensajes
    }, [messages])

    // ?? Reemplazo completo
    async function sendToWebhook(
        text: string,
        audio?: { base64: string; mimeType?: string; durationMs?: number }
    ): Promise<string[]> {
        const payload: any = {
            conversationId: convId,
            message: text,
            timestamp: new Date().toISOString(),
        }

        if (audio?.base64) {
            payload.audio = {
                base64: audio.base64,
                mimeType: audio.mimeType || "audio/webm",
                durationMs: audio.durationMs,
            }
        }

        // Usá el que tengas: param de propiedad o hardcode
        const url =
            webhookUrl?.trim() ||
            "https://devwebhookn8n.ezequiellamas.com/webhook/455582c0-6b85-4434-ae68-fd59c5a5fdd2"

        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })

        const raw = await res.text()

        try {
            const json = JSON.parse(raw)

            // ? Tu formato:
            // [ { "output.respuesta": "..." }, { "output.respuesta": "..." } ]
            if (Array.isArray(json)) {
                const msgs = json
                    .map((it: any) => it?.["output.respuesta"])
                    .filter(
                        (v: any) => typeof v === "string" && v.trim().length > 0
                    )
                if (msgs.length) return msgs
            }

            // Compatibilidad por si a veces viene objeto único
            if (
                json &&
                typeof json === "object" &&
                typeof json["output.respuesta"] === "string"
            ) {
                return [json["output.respuesta"]]
            }

            // Compat con tus formatos anteriores {output} o [{output}]
            if (json?.output) return [json.output]
            if (Array.isArray(json) && json[0]?.output) return [json[0].output]

            // Fallback: texto crudo como 1 mensaje
            return [raw]
        } catch {
            // No era JSON ? usar texto crudo
            return [raw]
        }
    }

    function delay(ms: number) {
        return new Promise((r) => setTimeout(r, ms))
    }

    // ?? Reemplazo completo
    async function send() {
        if (!input.trim() || loading) return

        const id = String(Date.now())

        // Pintar mensaje del usuario con estado "sending"
        setMessages((m) => [
            ...m,
            {
                id,
                content: input.trim(),
                sender: "user",
                timestamp: Date.now(),
                status: "sending",
            },
        ])

        setInput("")
        setLoading(true)
        setTyping(true)

        try {
            // ?? ahora devuelve string[]
            const replies = await sendToWebhook(input.trim())

            // Marcar el mensaje del user como "sent"
            setMessages((m) =>
                m.map((x) => (x.id === id ? { ...x, status: "sent" } : x))
            )

            // Si por algún motivo vino vacío, poné un fallback
            const list = replies.length
                ? replies
                : ["No recibí respuesta del webhook."]

            // Pintar cada respuesta como burbuja separada con pequeño delay
            for (const msg of list) {
                await delay(300) // efecto "pensando…"
                setMessages((m) => [
                    ...m,
                    {
                        id:
                            String(Date.now()) +
                            Math.random().toString(36).slice(2, 6),
                        content: String(msg),
                        sender: "bot",
                        timestamp: Date.now(),
                    },
                ])
                await delay(150)
            }
        } catch {
            // Error ? marcar user msg y mostrar error del bot
            setMessages((m) =>
                m
                    .map((x) => (x.id === id ? { ...x, status: "error" } : x))
                    .concat([
                        {
                            id: id + "e",
                            content: "Error al conectar con el webhook.",
                            sender: "bot",
                            timestamp: Date.now(),
                        },
                    ])
            )
        } finally {
            setTyping(false)
            setLoading(false)
        }
    }

    // Helpers para audio
    function blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => {
                const result = String(reader.result || "")
                const base64 = result.includes(",")
                    ? result.split(",")[1]
                    : result
                resolve(base64)
            }
            reader.onerror = reject
            reader.readAsDataURL(blob)
        })
    }

    async function startRecording() {
        if (recording) return
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            chunksRef.current = []
            recordStartRef.current = Date.now()

            const mediaRecorder = new MediaRecorder(stream)
            mediaRecorderRef.current = mediaRecorder

            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    chunksRef.current.push(e.data)
                }
            }

            mediaRecorder.onstop = async () => {
                try {
                    const mimeType = mediaRecorder.mimeType || "audio/webm"
                    const blob = new Blob(chunksRef.current, { type: mimeType })

                    // Detener tracks del stream
                    stream.getTracks().forEach((t) => t.stop())

                    const base64 = await blobToBase64(blob)
                    const durationMs = recordStartRef.current
                        ? Date.now() - recordStartRef.current
                        : undefined
                    recordStartRef.current = null
                    await sendAudioBase64(base64, mimeType, durationMs)
                } catch {
                    setMessages((m) => [
                        ...m,
                        {
                            id: String(Date.now()),
                            content: "No pude procesar el audio.",
                            sender: "bot",
                            timestamp: Date.now(),
                        },
                    ])
                } finally {
                    chunksRef.current = []
                }
            }

            mediaRecorder.start()
            setRecording(true)
        } catch {
            setMessages((m) => [
                ...m,
                {
                    id: String(Date.now()),
                    content:
                        "No pude acceder al micrófono. Revisá los permisos del navegador.",
                    sender: "bot",
                    timestamp: Date.now(),
                },
            ])
        }
    }

    function stopRecording() {
        if (!recording || !mediaRecorderRef.current) return
        try {
            mediaRecorderRef.current.stop()
        } finally {
            setRecording(false)
        }
    }

    async function sendAudioBase64(base64: string, mimeType: string, durationMs?: number) {
        if (loading) return

        const id = String(Date.now())

        // Mensaje del usuario indicando que envió un audio
        setMessages((m) => [
            ...m,
            {
                id,
                content: "🎤 Audio enviado",
                sender: "user",
                timestamp: Date.now(),
                status: "sending",
            },
        ])

        setLoading(true)
        setTyping(true)

        try {
            const replies = await sendToWebhook("", { base64, mimeType, durationMs })

            setMessages((m) => m.map((x) => (x.id === id ? { ...x, status: "sent" } : x)))

            const list = replies.length ? replies : ["No recibí respuesta del webhook."]

            for (const msg of list) {
                await delay(300)
                setMessages((m) => [
                    ...m,
                    {
                        id: String(Date.now()) + Math.random().toString(36).slice(2, 6),
                        content: String(msg),
                        sender: "bot",
                        timestamp: Date.now(),
                    },
                ])
                await delay(150)
            }
        } catch {
            setMessages((m) =>
                m
                    .map((x) => (x.id === id ? { ...x, status: "error" } : x))
                    .concat([
                        {
                            id: id + "e",
                            content: "Error al conectar con el webhook.",
                            sender: "bot",
                            timestamp: Date.now(),
                        },
                    ])
            )
        } finally {
            setTyping(false)
            setLoading(false)
        }
    }

    return (
        <div
            style={{
                width: "100%",
                maxWidth: 1000,
                margin: "0 auto",
                height: 600,
                display: "flex",
                flexDirection: "column",
                gap: 16,
                minHeight: 0,
            }}
        >
            <div
                style={{
                    padding: 16,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 14,
                    background: colors.surface,
                    boxShadow: "0 6px 18px rgba(16,24,40,0.06)",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 999,
                            background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryHover})`,
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                        }}
                    >
                        N
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, color: colors.text }}>{title}</div>
                        <div style={{ color: colors.muted }}>{description}</div>
                    </div>
                </div>
            </div>

            <div
                style={{
                    flex: 1,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 14,
                    padding: 12,
                    display: "flex",
                    flexDirection: "column",
                    background: colors.bg,
                    boxShadow: "0 8px 24px rgba(16,24,40,0.06)",
                    minHeight: 0,
                    overflow: "hidden",
                }}
            >
                <div
                    ref={listRef}
                    onScroll={() => {
                        const el = listRef.current
                        if (!el) return
                        const threshold = 80 // px
                        const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
                        isNearBottomRef.current = distanceFromBottom <= threshold
                    }}
                    style={{ flex: 1, overflow: "auto" }}
                >
                    {messages.map((m) => (
                        <div
                            key={m.id}
                            style={{
                                display: "flex",
                                justifyContent:
                                    m.sender === "user"
                                        ? "flex-end"
                                        : "flex-start",
                                margin: "8px 0",
                            }}
                        >
                            <div
                                style={{
                                    background:
                                        m.sender === "user"
                                            ? `linear-gradient(135deg, ${colors.primary}, ${colors.primaryHover})`
                                            : colors.surface,
                                    color:
                                        m.sender === "user" ? "#fff" : colors.text,
                                    padding: "10px 12px",
                                    borderRadius: 14,
                                    maxWidth: "80%",
                                    border: m.sender === "user" ? "none" : `1px solid ${colors.border}`,
                                    boxShadow:
                                        m.sender === "user"
                                            ? "0 6px 14px rgba(255,122,0,0.25)"
                                            : "0 4px 12px rgba(16,24,40,0.06)",
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: 14,
                                        whiteSpace: "pre-wrap",
                                    }}
                                >
                                    {m.content}
                                </div>
                                <div
                                    style={{
                                        fontSize: 11,
                                        opacity: 0.65,
                                        marginTop: 6,
                                        color: m.sender === "user" ? "#fff" : colors.muted,
                                    }}
                                >
                                    {new Date(m.timestamp).toLocaleTimeString(
                                        "es-ES",
                                        { hour: "2-digit", minute: "2-digit" }
                                    )}
                                    {m.sender === "user" && m.status && (
                                        <>
                                            {" "}
                                            ·{" "}
                                            {m.status === "sending"
                                                ? "…"
                                                : m.status === "sent"
                                                  ? "✓"
                                                  : "!"}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {typing && (
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "flex-start",
                                margin: "8px 0",
                            }}
                        >
                            <div
                                style={{
                                    background: colors.surface,
                                    color: colors.text,
                                    padding: "10px 12px",
                                    borderRadius: 14,
                                    maxWidth: "80%",
                                    border: `1px solid ${colors.border}`,
                                    boxShadow: "0 4px 12px rgba(16,24,40,0.06)",
                                }}
                            >
                                <div style={{ fontSize: 14, color: colors.muted }}>
                                    <TextShimmer as="span" duration={1.2}>
                                        Escribiendo
                                    </TextShimmer>
                                    
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={endRef} />
                </div>

                <div style={{ paddingTop: 8 }}>
                    <AIInputField
                        onSubmit={(msg) => {
                            sendMessage(msg)
                        }}
                        onToggleRecord={() => (recording ? stopRecording() : startRecording())}
                        isRecording={recording}
                        disabled={loading}
                    />
                </div>
            </div>
        </div>
    )
}

addPropertyControls(EmbedChat, {
    webhookUrl: { type: ControlType.String, title: "Webhook /api/chat" },
    title: {
        type: ControlType.String,
        title: "Título",
        defaultValue: "Coach Netia",
    },
    description: {
        type: ControlType.String,
        title: "Descripción",
        defaultValue: "Preguntame cualquier duda",
    },
})
