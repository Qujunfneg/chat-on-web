# Online Chat Room

## 📖 Project Introduction
Online Chat Room is a real-time communication application developed based on Node.js and Vue 3. It supports multi-user real-time chatting, image sharing, message quoting, and emoji functionality. This project adopts a front-end and back-end separated architecture, using Socket.io for real-time communication, and supports both web and Electron desktop clients, providing a clean and user-friendly interface and stable server support.

## 🚀 Features

### Core Features
- **Real-time Chat**: Supports multi-user real-time communication
- **User Management**: User join/leave notifications, online user list display
- **Message Types**: Supports sending text messages and image messages
- **Message Quoting**: Supports quoting and replying to other users' messages
- **@ Mention Function**: Supports @-mentioning specific users
- **User Nicknames**: Supports customizing and modifying user nicknames

### Media Features
- **Image Upload**: Supports uploading JPG, PNG, GIF, and WebP format images
- **Dynamic Emojis**: Built-in various dynamic emojis for users to choose from
- **Sticker Packs**: Supports browsing and using stickers by category

### System Management
- **CDN Directory Monitoring**: Automatically monitors the size of image storage directory, automatically cleans up old files when exceeding the threshold
- **Service Restart Cleanup**: Automatically cleans up CDN image directory when the service restarts to free up storage space
- **Chat History**: Automatically saves the latest 100 chat records

## 🛠 Tech Stack

### Backend
- **Node.js**: JavaScript runtime environment
- **Express**: Web application framework
- **Socket.io**: Real-time communication library
- **Multer**: File upload middleware

### Frontend
- **Vue 3**: JavaScript framework
- **Vite**: Build tool
- **Element Plus**: UI component library
- **Socket.io-client**: Socket.io client

## 📦 Installation Tutorial

### Environment Requirements
- Node.js 14.x or higher
- npm 6.x or higher

### Installation Steps

1. **Clone the Project**
```bash
# Clone project code
git clone [project address]
cd online-chat-room
```

2. **Install Backend Dependencies**
```bash
# Execute in the project root directory
npm install
```

3. **Install Frontend Dependencies**
```bash
# Enter the frontend directory
cd frontend
npm install
# Return to the root directory
cd ..
```

### Docker Support

1. Get image

```bash
docker pull ty13363959807/chat-on-web:latest
```

2. Start
   
```bash
docker run -d --name chat-room --net host \
    -e PORT=3000 \
    -e BIND_ADDRESS=0.0.0.0 \
    -e CDN_SIZE_LIMIT_MB=2048 \
    ty13363959807/chat-on-web:latest
```

3. Support envs
   
| name  | desc  |
|---|---|
| PORT  |  Listener port |
| BIND_ADDRESS  | Listener port  |
| CDN_SIZE_LIMIT_MB  | The maximum value of the image cache directory, measured in MB.  |

## 🚀 Usage Instructions

### Electron Desktop Client

The project supports an Electron desktop client, providing a more stable user experience and system integration features.

#### Configuration Instructions
The Electron client is configured through the `electron/conf.json` file, with main configuration items including server address, etc.

#### Minimum Window Size
The client has been set with a minimum width of 800px and a minimum height of 600px to ensure a good user experience.

### Web Development Environment

1. **Start Backend Service (Development Mode)**
```bash
# Execute in the project root directory
npm run dev
# This will start the server using nodemon, supporting hot reloading
```

2. **Start Frontend Development Server**
```bash
# Open a new terminal, enter the frontend directory
cd frontend
npm run dev
```

3. **Access the Application**
Open a browser and visit `http://localhost:5173` (or the address shown in the frontend console)

### Production Environment

1. **Build Frontend Application**
```bash
# Execute in the project root directory
npm run build
# This will automatically install frontend dependencies and build the frontend application
```

2. **Start Backend Service**
```bash
# Execute in the project root directory
npm start
# Or use process management tools like PM2
```

3. **Access the Application**
Open a browser and visit `http://localhost:3000` (or the server's IP address)

### Environment Variable Configuration

- **PORT**: Server port, default 3000
- **BIND_ADDRESS**: Binding address, default 0.0.0.0
- **CDN_SIZE_LIMIT_MB**: CDN image directory size limit (MB), default 500MB

## 📁 Project Structure

```
chat-on-web/
├── .github/             # GitHub configuration directory
│   └── workflows/       # GitHub Actions workflows
├── cdn-images/          # CDN image storage directory
├── data/                # Data storage directory
│   ├── emojis/          # Emoji resources
│   ├── images/          # Image resources
│   └── notice.md        # Announcement content
├── electron/            # Electron desktop application directory
│   ├── application.ico  # Application icon
│   ├── conf.json        # Client configuration file
│   ├── favicon.ico      # Webpage icon
│   └── main.js          # Electron main process file
├── electron-icon.svg    # Electron icon source file
├── frontend/            # Frontend project directory
│   ├── index.html       # Entry HTML file
│   ├── src/             # Frontend source code
│   │   ├── App.vue      # Root component
│   │   ├── Chat.vue    # Main chat room component
│   │   ├── components/  # Vue components
│   │   ├── main.js      # Entry file
│   │   ├── styles/      # Style files
│   │   └── utils/       # Utility functions
│   └── vite.config.js   # Vite configuration file
├── src/                 # Backend source code
│   ├── app.js           # Express application configuration
│   ├── config/          # Configuration files
│   ├── middleware/      # Middleware
│   ├── routes/          # Route definitions
│   ├── services/        # Business logic
│   └── websocket/       # WebSocket handling
├── server.js            # Backend entry file
├── README.md            # Project description document (Chinese)
└── README.en.md         # Project description document (English)
```

## 🔧 Feature Details

### User System
- **User Join**: Enter a username to join the chat room
- **User List**: Real-time display of currently online users
- **Nickname Modification**: Supports modifying user nicknames, all historical messages will also be updated synchronously

### Chat Features
- **Send Messages**: Enter text and press Enter to send messages
- **Quote Reply**: Right-click on messages to select quote and reply
- **@ User**: Right-click on user avatars to select @ that user
- **Image Sending**: Supports pasting images or drag-and-drop image upload

### Media Management
- **Image Storage**: Uploaded images are stored in the public/cdn-images directory
- **Automatic Cleanup**: When the image directory size exceeds the limit, the system will automatically delete the oldest files
- **Service Restart Cleanup**: All CDN images will be automatically cleaned up when the service restarts to ensure resource release

## 🤝 Contribution

1. Fork this repository
2. Create a Feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 Notes

1. Ensure that dependencies are installed in both the project root directory and frontend directory
2. Necessary directories will be automatically created when starting for the first time
3. To modify the CDN directory size limit, you can set it through the CDN_SIZE_LIMIT_MB environment variable
4. It is recommended to use process management tools like PM2 to manage Node.js processes in the production environment
5. The Electron client supports customizing the server address through configuration files

## 📄 License
This project uses the ISC license - see the [LICENSE](LICENSE) file for details
