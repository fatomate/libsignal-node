Failed to decrypt with 9 sessions (0 MAC errors)
Failed to decrypt with 9 sessions (0 MAC errors)
{"level":50,"time":"2025-08-31T04:24:11.699Z","pid":513070,"hostname":"wabotv3-sql","key":{"remoteJid":"114194640801953@lid","fromMe":true,"id":"C76F66A950E58AA4517A8111F10840A7"},"err":{"type":"SessionError","message":"No matching sessions found for message","stack":"SessionError: No matching sessions found for message\n    at SessionCipher.decryptWithSessions (/home/wabotdev/api-wabot-dev/public_html/node_modules/libsignal/src/session_cipher.js:275:15)\n    at runNextTicks (node:internal/process/task_queues:60:5)\n    at process.processTimers (node:internal/timers:516:9)\n    at async /home/wabotdev/api-wabot-dev/public_html/node_modules/libsignal/src/session_cipher.js:289:28\n    at async MutexManager._executeWithMutex (/home/wabotdev/api-wabot-dev/public_html/node_modules/libsignal/src/mutex_manager.js:141:20)\n    at async MutexManager.withMutex (/home/wabotdev/api-wabot-dev/public_html/node_modules/libsignal/src/mutex_manager.js:92:24)\n    at async SessionCipher.queueJob (/home/wabotdev/api-wabot-dev/public_html/node_modules/libsignal/src/session_cipher.js:105:16)\n    at async SessionCipher.decryptWhisperMessage (/home/wabotdev/api-wabot-dev/public_html/node_modules/libsignal/src/session_cipher.js:284:16)\n    at async Object.decryptMessage (file:///home/wabotdev/api-wabot-dev/public_html/node_modules/baileys/lib/Signal/libsignal.js:39:30)\n    at async decrypt (file:///home/wabotdev/api-wabot-dev/public_html/node_modules/baileys/lib/Utils/decode-wa-message.js:146:45)\n    at async file:///home/wabotdev/api-wabot-dev/public_html/node_modules/baileys/lib/Socket/messages-recv.js:649:21\n    at async file:///home/wabotdev/api-wabot-dev/public_html/node_modules/baileys/lib/Utils/make-mutex.js:16:36","name":"SessionError","metadata":{"sessionCount":9,"macErrorCount":0,"otherErrorCount":9,"silent":false},"silent":false},"msg":"failed to decrypt message"}
messages.upsert received for instance 6860DCA0E2819 : {
  "messages": [
    {
      "key": {
        "remoteJid": "114194640801953@lid",
        "fromMe": true,
        "id": "C76F66A950E58AA4517A8111F10840A7"
      },
      "messageTimestamp": 1756614251,
      "pushName": "Wabot Demo",
      "broadcast": false,
      "status": 2,
      "messageStubType": 2,
      "messageStubParameters": [
        "No matching sessions found for message"
      ]
    }
  ],
  "type": "notify"
}
[LID] Pattern 2: FromMe=true, LID remoteJid (need reverse lookup)
[LID] Normalizing fromMe message: 114194640801953@lid -> 60196953307@s.whatsapp.net
Would save message to MongoDB: C76F66A950E58AA4517A8111F10840A7
Emitted new_message_1 for message: C76F66A950E58AA4517A8111F10840A7 (type: text, media: pending)
messages.upsert received for instance 6860DCA0E2819 : {
  "messages": [
    {
      "key": {
        "remoteJid": "60173577321@s.whatsapp.net",
        "fromMe": true,
        "id": "3C540185034F6011216A1225D0655DE8"
      },
      "messageTimestamp": 1756614257,
      "broadcast": false,
      "status": 2,
      "message": {
        "protocolMessage": {
          "type": "PEER_DATA_OPERATION_REQUEST_RESPONSE_MESSAGE",
          "peerDataOperationRequestResponseMessage": {
            "peerDataOperationRequestType": "PLACEHOLDER_MESSAGE_RESEND",
            "stanzaId": "3EB00ADD680B2E183267DC",
            "peerDataOperationResult": [
              {
                "mediaUploadResult": "SUCCESS",
                "placeholderMessageResendResponse": {
                  "webMessageInfoBytes": "CjkKEzExNDE5NDY0MDgwMTk1M0BsaWQQARogQzc2RjY2QTk1MEU1OEFBNDUxN0E4MTExRjEwODQwQTcSKwoEUHllc5oCIhogYGUim4iqyeBWGz1jDtIKP8Ju8M72gHofYEptkKuTB6MY6pzPxQYgBDDrnM/FBsICJgoaNjAxOTY5NTMzMDdAcy53aGF0c2FwcC5uZXQQABjrnM/FBiAAwgIfChMxMTQxOTQ2NDA4MDE5NTNAbGlkEOucz8UGGAAgAIoDIGBlIpuIqsngVhs9Yw7SCj/CbvDO9oB6H2BKbZCrkwejiAQA"
                }
              }
            ]
          }
        }
      }
    }
  ],
  "type": "notify"
}
Skipping protocolMessage for instance 6860DCA0E2819: 17
Failed to decrypt with 9 sessions (0 MAC errors)
Failed to decrypt with 9 sessions (0 MAC errors)
{"level":50,"time":"2025-08-31T04:24:17.519Z","pid":513070,"hostname":"wabotv3-sql","key":{"remoteJid":"114194640801953@lid","fromMe":true,"id":"C76F66A950E58AA4517A8111F10840A7"},"err":{"type":"SessionError","message":"No matching sessions found for message","stack":"SessionError: No matching sessions found for message\n    at SessionCipher.decryptWithSessions (/home/wabotdev/api-wabot-dev/public_html/node_modules/libsignal/src/session_cipher.js:275:15)\n    at runNextTicks (node:internal/process/task_queues:60:5)\n    at process.processTimers (node:internal/timers:516:9)\n    at async /home/wabotdev/api-wabot-dev/public_html/node_modules/libsignal/src/session_cipher.js:289:28\n    at async MutexManager._executeWithMutex (/home/wabotdev/api-wabot-dev/public_html/node_modules/libsignal/src/mutex_manager.js:141:20)\n    at async MutexManager.withMutex (/home/wabotdev/api-wabot-dev/public_html/node_modules/libsignal/src/mutex_manager.js:92:24)\n    at async SessionCipher.queueJob (/home/wabotdev/api-wabot-dev/public_html/node_modules/libsignal/src/session_cipher.js:105:16)\n    at async SessionCipher.decryptWhisperMessage (/home/wabotdev/api-wabot-dev/public_html/node_modules/libsignal/src/session_cipher.js:284:16)\n    at async Object.decryptMessage (file:///home/wabotdev/api-wabot-dev/public_html/node_modules/baileys/lib/Signal/libsignal.js:39:30)\n    at async decrypt (file:///home/wabotdev/api-wabot-dev/public_html/node_modules/baileys/lib/Utils/decode-wa-message.js:146:45)\n    at async file:///home/wabotdev/api-wabot-dev/public_html/node_modules/baileys/lib/Socket/messages-recv.js:649:21\n    at async file:///home/wabotdev/api-wabot-dev/public_html/node_modules/baileys/lib/Utils/make-mutex.js:16:36\n    at async Promise.all (index 0)\n    at async handleMessage (file:///home/wabotdev/api-wabot-dev/public_html/node_modules/baileys/lib/Socket/messages-recv.js:647:13)\n    at async processNodeWithBuffer (file:///home/wabotdev/api-wabot-dev/public_html/node_modules/baileys/lib/Socket/messages-recv.js:842:9)","name":"SessionError","metadata":{"sessionCount":9,"macErrorCount":0,"otherErrorCount":9,"silent":false},"silent":false},"msg":"failed to decrypt message"}
messages.upsert received for instance 6860DCA0E2819 : {
  "messages": [
    {
      "key": {
        "remoteJid": "114194640801953@lid",
        "fromMe": true,
        "id": "C76F66A950E58AA4517A8111F10840A7"
      },
      "messageTimestamp": 1756614257,
      "pushName": "Wabot Demo",
      "broadcast": false,
      "status": 2,
      "messageStubType": 2,
      "messageStubParameters": [
        "No matching sessions found for message"
      ]
    }
  ],
  "type": "notify"
}
[LID] Pattern 2: FromMe=true, LID remoteJid (need reverse lookup)
[LID] Normalizing fromMe message: 114194640801953@lid -> 60196953307@s.whatsapp.net
Skipping duplicate message: C76F66A950E58AA4517A8111F10840A7:stub
messages.upsert received for instance 6860DCA0E2819 : {
  "messages": [
    {
      "key": {
        "remoteJid": "114194640801953@lid",
        "fromMe": true,
        "id": "C76F66A950E58AA4517A8111F10840A7"
      },
      "message": {
        "conversation": "Pyes",
        "messageContextInfo": {
          "messageSecret": "YGUim4iqyeBWGz1jDtIKP8Ju8M72gHofYEptkKuTB6M="
        }
      },
      "messageTimestamp": "1756614250",
      "status": "READ",
      "messageC2STimestamp": "1756614251",
      "userReceipt": [
        {
          "userJid": "60196953307@s.whatsapp.net",
          "receiptTimestamp": "0",
          "readTimestamp": "1756614251",
          "playedTimestamp": "0"
        },
        {
          "userJid": "114194640801953@lid",
          "receiptTimestamp": "1756614251",
          "readTimestamp": "0",
          "playedTimestamp": "0"
        }
      ],
      "messageSecret": "YGUim4iqyeBWGz1jDtIKP8Ju8M72gHofYEptkKuTB6M=",
      "isMentionedInStatus": false
    }
  ],
  "type": "notify",
  "requestId": "3EB00ADD680B2E183267DC"
}
[LID] Pattern 2: FromMe=true, LID remoteJid (need reverse lookup)
[LID] Normalizing fromMe message: 114194640801953@lid -> 60196953307@s.whatsapp.net
Skipping duplicate message: C76F66A950E58AA4517A8111F10840A7:stub
messages.upsert received for instance 6860DCA0E2819 : {
  "messages": [
    {
      "key": {
        "remoteJid": "114194640801953@lid",
        "fromMe": true,
        "id": "C76F66A950E58AA4517A8111F10840A7"
      },
      "messageTimestamp": 1756614257,
      "pushName": "Wabot Demo",
      "broadcast": false,
      "status": 2,
      "verifiedBizName": "Wabot Demo",
      "message": {
        "conversation": "Pyes"
      }
    }
  ],
  "type": "notify"
}