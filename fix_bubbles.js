const fs = require('fs');
const menteePath = 'd:\\Projects\\Scholarslee\\Frontend\\src\\MenteesPanel\\components\\ChatsComponents\\MessageBubble.jsx';
const mentorPath = 'd:\\Projects\\Scholarslee\\Frontend\\src\\MentorPanel\\components\\ChatsComponents\\MessageBubble.jsx';

const menteeContent = `import React from "react"
import { Check, CheckCheck } from "lucide-react"

export default function MessageBubble({ message }) {
  const isMe = message.sender === "me"
  const delivered = !!message.delivered
  const seen = !!message.seen

  return (
    <div className={\`flex \${isMe ? "justify-end" : "justify-start"}\`}>
      <div className="max-w-[85%] md:max-w-md">
        {!isMe && (
          <div className="flex items-center gap-2 mb-2">
            <img src={message.avatar || "/a.jpg"} alt="" className="w-6 h-6 rounded-full" />
            <span className="text-gray-500 text-xs">Mentor</span>
          </div>
        )}
        <div className={\`rounded-2xl px-4 py-3 \${isMe ? "bg-gray-100 text-[#111111]" : "bg-[#5D38DE] text-white"}\`}>
          <p className="text-sm leading-relaxed">{message.text}</p>
        </div>

        {isMe && (
          <div className="flex items-center gap-1 mt-1 justify-end">
            {seen ? (
              <CheckCheck className="w-4 h-4 text-blue-500" />
            ) : delivered ? (
              <CheckCheck className="w-4 h-4 text-gray-400" />
            ) : (
              <Check className="w-4 h-4 text-gray-400" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
`;

const mentorContent = `import React from "react"
import { Download, Check, CheckCheck } from "lucide-react"

export default function MessageBubble({ message }) {
  const getFileIcon = (fileName = '') => {
    const extension = fileName.split('.').pop().toLowerCase()
    switch (extension) {
      case 'pdf':
        return 'PDF'
      case 'doc':
      case 'docx':
        return 'DOC'
      case 'txt':
        return 'TXT'
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'IMG'
      default:
        return 'FILE'
    }
  }

  const handleDownload = () => {
    // Create a temporary download link
    const link = document.createElement('a')
    link.href = message.fileUrl || '#' // In real app, this would be the actual file URL
    link.download = message.fileName
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Show download notification
    console.log(\`Downloading \${message.fileName}\`)
  }

  if (message.type === "file") {
    return (
      <div className={\`flex \${message.sender === "me" ? "justify-end" : "justify-start"}\`}>
        <div className="max-w-[85%] md:max-w-md">
          {message.sender === "me" && (
            <div className="flex items-center gap-2 mb-2 justify-end">
              <span className="text-gray-400 text-xs">You</span>
            </div>
          )}
          {message.sender === "them" && (
            <div className="flex items-center gap-2 mb-2">
              <img src={message.avatar || "/a.jpg"} alt="" className="w-6 h-6 rounded-full" />
              <span className="text-gray-400 text-xs">Tamim</span>
            </div>
          )}
          <div className="bg-[#242424] rounded-lg p-4 flex items-center gap-3 hover:bg-[#2a2a2a] transition-colors cursor-pointer" onClick={handleDownload}>
            <div className="w-12 h-12 bg-[#5D38DE] rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold text-sm">{getFileIcon(message.fileName)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{message.fileName}</p>
              <p className="text-gray-400 text-xs">{message.fileSize}</p>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation()
                handleDownload()
              }}
              className="w-8 h-8 rounded-full bg-[#333333] flex items-center justify-center hover:bg-[#3a3a3a] transition-colors flex-shrink-0"
            >
              <Download className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          {message.sender === "me" && (
            <div className="flex items-center gap-1 mt-1 justify-end">
                {message.seen ? (
                  <CheckCheck className="w-4 h-4 text-blue-500" />
                ) : message.delivered ? (
                  <CheckCheck className="w-4 h-4 text-gray-400" />
                ) : (
                  <Check className="w-4 h-4 text-gray-400" />
                )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={\`flex \${message.sender === "me" ? "justify-end" : "justify-start"}\`}>
      <div className="max-w-[85%] md:max-w-md">
        {message.sender === "them" && (
          <div className="flex items-center gap-2 mb-2">
            <img src={message.avatar || "/a.jpg"} alt="" className="w-6 h-6 rounded-full" />
            <span className="text-gray-400 text-xs">{message.senderName || 'Student'}</span>
          </div>
        )}
        <div
          className={\`rounded-2xl px-4 py-3 \${
            message.sender === "me" ? "bg-[#242424] text-white" : "bg-[#5D38DE] text-white"
          }\`}
        >
          <p className="text-sm leading-relaxed">{message.text}</p>
        </div>
        {message.sender === "me" && (
          <div className="flex items-center gap-1 mt-1 justify-end">
            {message.seen ? (
              <CheckCheck className="w-4 h-4 text-blue-500" />
            ) : message.delivered ? (
              <CheckCheck className="w-4 h-4 text-gray-400" />
            ) : (
              <Check className="w-4 h-4 text-gray-400" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
`;

fs.writeFileSync(menteePath, menteeContent);
console.log('Fixed Mentee MessageBubble.jsx');

fs.writeFileSync(mentorPath, mentorContent);
console.log('Fixed Mentor MessageBubble.jsx');
