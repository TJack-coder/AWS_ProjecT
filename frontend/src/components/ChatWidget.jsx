import React, { useState } from 'react';
import { Bot, Send, X } from 'lucide-react';
import { libraryApi, mediaUrl } from '../api';

export default function ChatWidget({ onOpenBook }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([{ role:'assistant', text:'Xin chào! Tôi có thể tìm sách, kiểm tra sách đang mượn hoặc cảnh báo đến hạn.' }]);
  const send = async (event) => {
    event.preventDefault(); if (!input.trim() || loading) return;
    const text=input.trim(); setInput(''); setMessages((m)=>[...m,{role:'user',text}]); setLoading(true);
    try { const result=await libraryApi.chat(text); setMessages((m)=>[...m,{role:'assistant',text:result.reply,books:result.books||[]}]); }
    catch(error){ setMessages((m)=>[...m,{role:'assistant',text:error.message}]); }
    finally{ setLoading(false); }
  };
  return <><button className="chat-launcher" onClick={()=>setOpen(true)} title="Trợ lý thư viện"><Bot size={23}/></button>{open&&<aside className="chat-panel"><header><div><Bot size={21}/><span><strong>CloudLibrary Assistant</strong><small>Trợ lý tra cứu nhanh</small></span></div><button onClick={()=>setOpen(false)}><X size={19}/></button></header><div className="chat-messages">{messages.map((msg,index)=><div key={index} className={`chat-message ${msg.role}`}><p>{msg.text}</p>{msg.books?.map((book)=><button className="chat-book" key={book.id} onClick={()=>onOpenBook(book)}><img src={mediaUrl(book.cover)} alt=""/><span><strong>{book.title}</strong><small>{book.author}</small></span></button>)}</div>)}{loading&&<div className="chat-message assistant"><p>Đang tra cứu...</p></div>}</div><form onSubmit={send}><input value={input} onChange={(e)=>setInput(e.target.value)} placeholder="Ví dụ: Gợi ý sách học AWS"/><button disabled={loading}><Send size={18}/></button></form></aside>}</>;
}
