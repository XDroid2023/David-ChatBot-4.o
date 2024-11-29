// Initialize the chatbot class
window.Chatbot = class Chatbot {
    constructor() {
        this.name = 'David';
        this.userName = '';
        this.awaitingName = true;
        this.isListening = false;
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.conversationHistory = [];
        this.context = {
            lastTopic: null,
            userPreferences: JSON.parse(localStorage.getItem('userPreferences')) || {},
            sessionStartTime: new Date()
        };
        this.conversationContext = {
            lastTopic: null,
            mentionedDJs: new Set(),
            userInterests: new Set(),
            questionCount: 0,
            lastResponse: null
        };
        this.responsePatterns = {
            followUp: {
                dj: "Would you like to know more about their upcoming shows or musical style?",
                music: "I can tell you more about specific genres or recommend some tracks!",
                booking: "I can help you with the booking process or provide more details about our services.",
                general: "Is there anything specific you'd like to know more about?"
            },
            transitions: {
                dj: "Speaking of our DJs, ",
                music: "On the topic of music, ",
                booking: "Regarding bookings, ",
                events: "About our events, "
            }
        };
        
        // DJ Information Database
        this.djInfo = {
            'micky': {
                name: 'DJ Micky',
                title: 'The Crowd\'s Connoisseur',
                description: 'A true crowd-pleaser known for electrifying sets and an uncanny ability to read the room. With a broad music palette ranging from house and techno to hip-hop and pop, Micky brings refreshing versatility that keeps listeners engaged.',
                specialties: ['crowd reading', 'playlist curation', 'house music', 'techno', 'hip-hop', 'pop'],
                experience: '10+ years',
                style: 'Versatile and engaging, specializing in creating unforgettable experiences through music',
                background: 'Started at local parties and events, developing a passion for diverse musical genres. Known for incorporating live visuals and interactive elements in performances.',
                strengths: [
                    'Expert crowd reading',
                    'Dynamic playlist adaptation',
                    'Live visual integration',
                    'Interactive performance elements',
                    'Versatile genre mixing'
                ],
                signature: 'Creating immersive experiences that keep audiences coming back for more'
            },
            'fusion': {
                name: 'DJ Fusion',
                title: 'The Musical Maestro',
                description: 'A master of blending different styles and sounds, creating vibrant and immersive atmospheres. Combines EDM, reggae, and even classical music into unique, resonating mixes.',
                specialties: ['genre fusion', 'EDM', 'reggae', 'classical fusion', 'sound engineering', 'music production'],
                style: 'Creative and technical, known for deep, resonating mixes and original productions',
                background: 'Rooted in music production and sound engineering, creating original tracks and remixes for unique performances.',
                strengths: [
                    'Advanced sound engineering',
                    'Original music production',
                    'Genre-blending expertise',
                    'Festival performance mastery',
                    'Creative remix capabilities'
                ],
                signature: 'Crafting unique soundscapes that blend multiple genres into cohesive musical journeys',
                performances: 'Sought-after name in festivals and club scenes'
            },
            'ipro': {
                name: 'DJ IPro',
                title: 'The Innovator',
                description: 'The embodiment of innovation in DJing, blending traditional techniques with cutting-edge technology to push performance boundaries.',
                specialties: ['live sampling', 'real-time remixing', 'technological innovation', 'live instruments', 'interactive performance'],
                style: 'Innovative and experimental, combining technology with traditional DJing',
                background: 'Pioneer in incorporating modern technology into live performances, regularly collaborating with other artists.',
                strengths: [
                    'Cutting-edge technology integration',
                    'Live sampling expertise',
                    'Real-time remixing',
                    'Live instrument incorporation',
                    'Interactive audience engagement'
                ],
                signature: 'Creating unique, technology-driven performances that redefine live DJ shows',
                innovations: 'Experiments with live sampling, real-time remixing, and interactive audience elements'
            }
        };
        
        // Initialize name overlay elements
        this.nameOverlay = document.getElementById('nameOverlay');
        this.nameInput = document.getElementById('nameInput');
        this.nameSubmit = document.getElementById('nameSubmit');
        
        // Show name overlay immediately
        this.setupNameInput();
        this.nameOverlay.classList.remove('hidden');
        
        // Ask for name first
        const message = "What's your name?";
        this.addMessage(message);
        this.speak(message);
        this.nameInput.focus();
        
        this.initializeSpeechRecognition();
    }

    setupNameInput() {
        // Handle name submission
        this.nameSubmit.addEventListener('click', () => this.handleNameSubmission());
        this.nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleNameSubmission();
            }
        });

        // Focus the input
        setTimeout(() => {
            this.nameInput.focus();
        }, 500);
    }

    handleNameSubmission() {
        const name = this.nameInput.value.trim();
        if (name.length >= 2) {
            this.userName = name;
            this.awaitingName = false;
            localStorage.setItem('userName', name);
            
            // Animate overlay out
            this.nameOverlay.style.animation = 'fadeOut 0.5s ease-in-out forwards';
            setTimeout(() => {
                this.nameOverlay.classList.add('hidden');
                const confirmMessage = `Hello ${name}, I've checked your name! I'm David, your AI assistant at Fusion2Radio. How can I help you today?`;
                this.addMessage(confirmMessage);
                this.speak(confirmMessage);
            }, 500);
        } else {
            this.nameInput.classList.add('shake');
            setTimeout(() => this.nameInput.classList.remove('shake'), 500);
        }
    }

    welcomeUser() {
        const greeting = `Welcome ${this.userName}! I'm David, your AI assistant at Fusion2Radio. How can I help you today?`;
        this.addMessage(greeting);
        this.speak(greeting);
    }

    welcomeBack() {
        const timeOfDay = this.getTimeOfDay();
        const welcomeBack = `Good ${timeOfDay} ${this.userName}! Welcome back to Fusion2Radio. How can I assist you today?`;
        setTimeout(() => {
            this.addMessage(welcomeBack);
            this.speak(welcomeBack);
        }, 1000);
    }

    initializeSpeechRecognition() {
        if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            // Improved recognition settings
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';
            this.recognition.maxAlternatives = 5;
            
            this.recognition.onstart = () => {
                this.isListening = true;
                document.getElementById('micButton').classList.add('listening');
                this.updateMicrophoneStatus(this.awaitingName ? 'Listening for your name...' : 'Listening...');
            };

            this.recognition.onresult = (event) => {
                let finalTranscript = '';
                let interimTranscript = '';
                
                // Process all results to find the best match
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const result = event.results[i];
                    
                    if (result.isFinal) {
                        // Get all alternatives and find the best one
                        let bestTranscript = '';
                        let bestConfidence = 0;
                        
                        for (let j = 0; j < result.length; j++) {
                            const alternative = result[j];
                            if (alternative.confidence > bestConfidence) {
                                bestConfidence = alternative.confidence;
                                bestTranscript = alternative.transcript;
                            }
                        }
                        
                        finalTranscript = this.processTranscript(bestTranscript);
                        
                        if (this.awaitingName) {
                            const name = this.extractName(finalTranscript);
                            if (name) {
                                this.userName = name;
                                this.awaitingName = false;
                                localStorage.setItem('userName', name);
                                this.stopListening();
                                const welcomeMessage = `Welcome ${this.userName}! How can I help you today?`;
                                this.addMessage(welcomeMessage);
                                this.speak(welcomeMessage);
                                return;
                            } else {
                                this.updateMicrophoneStatus("Could you please say your name again?");
                                return;
                            }
                        } else {
                            const userInput = document.querySelector('input[name="message"]');
                            userInput.value = finalTranscript;
                            this.stopListening();
                            
                            setTimeout(() => {
                                const form = document.querySelector('form');
                                form.dispatchEvent(new Event('submit'));
                            }, 500);
                        }
                    } else {
                        // Show interim results while speaking
                        interimTranscript = this.processTranscript(result[0].transcript);
                        this.updateMicrophoneStatus(`Heard: ${interimTranscript}`);
                    }
                }
            };

            this.recognition.onend = () => {
                this.isListening = false;
                document.getElementById('micButton').classList.remove('listening');
                if (this.awaitingName) {
                    this.updateMicrophoneStatus('Click the microphone and say your name clearly');
                } else {
                    this.updateMicrophoneStatus('Click to speak');
                }
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.stopListening();
                
                let errorMessage = 'Error with speech recognition. ';
                switch (event.error) {
                    case 'no-speech':
                        errorMessage += 'No speech was detected. Please try again.';
                        break;
                    case 'aborted':
                        errorMessage += 'Speech input was aborted.';
                        break;
                    case 'audio-capture':
                        errorMessage += 'Make sure your microphone is connected.';
                        break;
                    case 'not-allowed':
                        errorMessage += 'Please allow microphone access.';
                        break;
                    case 'network':
                        errorMessage += 'Check your internet connection.';
                        break;
                    default:
                        errorMessage += 'Please try again.';
                }
                
                this.updateMicrophoneStatus(errorMessage);
            };
        } else {
            console.error('Speech recognition not supported');
            this.updateMicrophoneStatus('Speech recognition not supported in this browser');
        }
    }

    processTranscript(transcript) {
        // Clean up the transcript
        transcript = transcript.trim().toLowerCase();
        
        // Common speech recognition corrections
        const corrections = {
            'my name is': '',
            'i am': '',
            "i'm": '',
            'this is': '',
            'the name is': '',
            'name is': '',
            'called': '',
            'hi': '',
            'hello': '',
            'hey': '',
            'higher': 'hi',
            'hire': 'hi',
            'think': 'thank',
            'thanks': 'thank',
            'thing': 'thank',
            'tanks': 'thanks',
            'thanked': 'thank',
            'thinking': 'thank',
            'your': 'you',
            'ur': 'you',
            'please': '',
            'could you': '',
            'can you': '',
            'would you': '',
            'tell me': ''
        };

        // Apply corrections
        for (const [error, correction] of Object.entries(corrections)) {
            const regex = new RegExp(`\\b${error}\\b`, 'gi');
            transcript = transcript.replace(regex, correction);
        }

        // Clean up extra spaces
        transcript = transcript.replace(/\s+/g, ' ').trim();
        
        // Capitalize first letter
        return transcript.charAt(0).toUpperCase() + transcript.slice(1);
    }

    extractName(transcript) {
        // Remove common phrases and clean up
        transcript = this.processTranscript(transcript);
        
        // Split into words and get the first remaining word
        const words = transcript.split(/\s+/);
        const name = words[0];
        
        // Validate the name
        if (name && name.length >= 2 && /^[A-Za-z]+$/.test(name)) {
            return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        }
        
        return '';
    }

    startListening() {
        if (this.recognition && !this.isListening) {
            try {
                this.recognition.start();
            } catch (error) {
                if (error.name === 'InvalidStateError') {
                    // Recognition already started, stop and restart
                    this.recognition.stop();
                    setTimeout(() => this.recognition.start(), 100);
                } else {
                    console.error('Speech recognition error:', error);
                    this.updateMicrophoneStatus('Error starting speech recognition');
                }
            }
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            try {
                this.recognition.stop();
            } catch (error) {
                console.error('Error stopping speech recognition:', error);
            }
        }
    }

    speak(text) {
        if (!this.synthesis) return;
        
        // Remove emojis and their variations from the text before speaking
        const cleanText = text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2300}-\u{23FF}]|[\u{2B50}]|[\u{2B06}]|[\u{2934}]|[\u{2935}]|[\u{1F197}]|[\u{1F195}]|[\u{1F193}]|[\u{1F199}]/gu, '');
        
        // Clean up any double spaces that might have been created
        const finalText = cleanText.replace(/\s+/g, ' ').trim();

        const utterance = new SpeechSynthesisUtterance(finalText);
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;
        this.synthesis.speak(utterance);
    }

    startChat() {
        // Don't proceed if still awaiting name
        if (this.awaitingName) {
            return;
        }
        
        const message = `Hello ${this.userName}, I've checked your name! I'm David, your AI assistant at Fusion2Radio. How can I help you today?`;
        this.addMessage(message);
        this.speak(message);
    }

    async processInput(input) {
        // Update conversation context
        this.conversationContext.questionCount++;
        
        // Analyze input for key topics and interests
        const topics = this.analyzeTopics(input.toLowerCase());
        if (topics.length > 0) {
            topics.forEach(topic => this.conversationContext.userInterests.add(topic));
        }

        // Get base response
        const response = await this.handleIntent(input);

        // Add contextual follow-up based on conversation history
        const enhancedResponse = this.enhanceResponse(response, topics);

        // Update conversation context
        this.conversationContext.lastResponse = enhancedResponse;
        this.conversationContext.lastTopic = topics[0] || null;

        return enhancedResponse;
    }

    analyzeTopics(input) {
        const topics = [];
        const topicKeywords = {
            dj: ['dj', 'mix', 'perform', 'play'],
            music: ['music', 'song', 'track', 'genre', 'beat'],
            events: ['event', 'show', 'performance', 'live'],
            technical: ['stream', 'quality', 'audio', 'sound'],
            community: ['community', 'chat', 'interact', 'join']
        };

        for (const [topic, keywords] of Object.entries(topicKeywords)) {
            if (keywords.some(keyword => input.includes(keyword))) {
                topics.push(topic);
            }
        }

        return topics;
    }

    enhanceResponse(baseResponse, topics) {
        let enhanced = baseResponse;

        // Add personalized elements based on conversation history
        if (this.userName) {
            enhanced = enhanced.replace('Welcome to', `Welcome back to`);
        }

        // Add contextual follow-ups
        if (topics.length > 0 && this.conversationContext.questionCount > 1) {
            const topic = topics[0];
            if (this.responsePatterns.followUp[topic]) {
                enhanced += `\n\n${this.responsePatterns.followUp[topic]}`;
            }
        }

        // Add relevant transitions based on user interests
        if (this.conversationContext.userInterests.size > 0 && Math.random() < 0.3) {
            const interests = Array.from(this.conversationContext.userInterests);
            const randomInterest = interests[Math.floor(Math.random() * interests.length)];
            if (this.responsePatterns.transitions[randomInterest]) {
                enhanced += `\n\n${this.responsePatterns.transitions[randomInterest]}`;
            }
        }

        return enhanced;
    }

    async handleIntent(input) {
        // Clean and normalize input
        input = input.trim().toLowerCase();
        
        // Add to conversation history
        this.conversationHistory.push({ role: 'user', content: input });
        
        // Update context based on input
        this.updateContext(input);
        
        // Generate response based on intent and context
        const intent = this.detectIntent(input);
        let response = '';
        
        switch (intent) {
            case 'greeting':
                response = this.generateGreetingResponse();
                break;
            case 'dj':
            case 'djInfo':
                response = await this.handleDJQuery(input);
                break;
            case 'music':
                response = this.handleMusicQuery(input);
                break;
            case 'radio':
                response = this.handleRadioQuery(input);
                break;
            case 'schedule':
                response = this.handleScheduleQuery(input);
                break;
            case 'help':
                response = this.generateHelpResponse();
                break;
            case 'farewell':
                response = this.generateFarewellResponse();
                break;
            case 'booking':
                response = this.handleBookingQuery(input);
                break;
            case 'contact':
                response = this.handleContactQuery(input);
                break;
            case 'listen':
                response = this.handleListenQuery(input);
                break;
            case 'fusion2radio':
                response = this.handleFusion2RadioQuery(input);
                break;
            default:
                response = this.generateGeneralResponse(input);
        }
        
        // Add response to conversation history
        this.conversationHistory.push({ role: 'assistant', content: response });
        
        // Update user preferences if relevant
        this.updateUserPreferences(input, response);
        
        return response;
    }

    detectIntent(input) {
        const intents = {
            greeting: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
            music: ['song', 'music', 'play', 'track', 'artist', 'album'],
            radio: ['radio', 'station', 'frequency', 'channel', 'stream'],
            schedule: ['schedule', 'program', 'show', 'time', 'when'],
            help: ['help', 'support', 'assist', 'guide', 'how to'],
            farewell: ['bye', 'goodbye', 'see you', 'later', 'exit'],
            dj: ['dj', 'deejay', 'micky', 'fusion', 'ipro', 'mix', 'performer'],
            djInfo: ['who is', 'tell me about', 'what does', 'know about'],
            booking: ['book', 'booking', 'reserve', 'appointment'],
            contact: ['contact', 'email', 'reach', 'message'],
            listen: ['listen', 'stream', 'tune in', 'where to find'],
            fusion2radio: ['fusion2radio', 'about', 'tell me more']
        };

        for (const [intent, keywords] of Object.entries(intents)) {
            if (keywords.some(keyword => input.includes(keyword))) {
                return intent;
            }
        }
        return 'general';
    }

    async handleDJQuery(input) {
        // Track mentioned DJs
        const djNames = ['micky', 'fusion', 'ipro'];
        const mentionedDJ = djNames.find(name => input.toLowerCase().includes(name));
        if (mentionedDJ) {
            this.conversationContext.mentionedDJs.add(mentionedDJ);
        }

        // Get base response
        const baseResponse = this.getDJResponse(input);

        // Add personalized recommendations based on conversation history
        if (this.conversationContext.mentionedDJs.size > 1) {
            const otherDJs = Array.from(this.conversationContext.mentionedDJs)
                .filter(dj => !input.toLowerCase().includes(dj));
            if (otherDJs.length > 0) {
                const randomDJ = otherDJs[Math.floor(Math.random() * otherDJs.length)];
                return baseResponse + `\n\nSince you're interested in our DJs, you might also enjoy ${this.djInfo[randomDJ].name}'s unique style of ${this.djInfo[randomDJ].specialties.slice(0, 2).join(' and ')}.`;
            }
        }

        return baseResponse;
    }

    getDJResponse(input) {
        // Existing DJ response logic...
        if (input.includes('all djs') || input.includes('dj trio') || input.includes('all three')) {
            return `At Fusion2Radio, we have three incredible DJs, each bringing their unique style:\n\n` +
                   `1. DJ Micky - The Crowd's Connoisseur: A master of reading audiences and creating unforgettable experiences through perfectly curated playlists.\n\n` +
                   `2. DJ Fusion - The Musical Maestro: A sound engineering expert who blends multiple genres into unique, resonating performances.\n\n` +
                   `3. DJ IPro - The Innovator: Pushing boundaries by combining cutting-edge technology with traditional DJing techniques.\n\n` +
                   `Would you like to know more about any of them specifically?`;
        }
        
        const mentionedDJ = ['micky', 'fusion', 'ipro'].find(name => input.toLowerCase().includes(name));
        if (mentionedDJ) {
            const dj = this.djInfo[mentionedDJ];
            return `${dj.name}, ${dj.title}\n\n` +
                   `${dj.description}\n\n` +
                   `Background: ${dj.background}\n\n` +
                   `Key Strengths:\n` +
                   dj.strengths.map(strength => `• ${strength}`).join('\n') + '\n\n' +
                   `Signature Style: ${dj.signature}`;
        }

        return `Our DJ trio represents the pinnacle of innovation in the music industry. Each brings their unique expertise:\n\n` +
               `• DJ Micky: Expert crowd reader and versatile performer\n` +
               `• DJ Fusion: Master of genre-blending and sound engineering\n` +
               `• DJ IPro: Technology innovator and live performance specialist\n\n` +
               `They regularly collaborate and host workshops to mentor aspiring DJs. Would you like to know more about any of them?`;
    }

    handleMusicQuery(input) {
        // Check if it's a song request
        if (input.toLowerCase().includes('request') || input.toLowerCase().includes('song request') || input.toLowerCase().includes('play')) {
            return `Great news! You can submit your song requests to Rock Moulds. Here's how:\n\n` +
                   ` Send your request to rockmoulds@gmail.com including:\n` +
                   `• Your name or nickname\n` +
                   `• Song name and artist\n` +
                   `• Why you love this song (optional)\n\n` +
                   `Your requests help shape our playlist and create an amazing music community! We'll try to feature your song and might even share your story on our social media.\n\n` +
                   `Stay tuned to hear your requested tracks on air! `;
        }

        // For other music-related queries
        const responses = [
            `At Rock Moulds, we believe music brings people together. We feature everything from empowering anthems to heartfelt ballads and electrifying rock hits!`,
            `Our playlist is shaped by our amazing listeners like you. Want to request a song? Just email rockmoulds@gmail.com!`,
            `We're always exploring new music and featuring underground artists. Keep listening for fresh tracks and exclusive interviews!`
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    handleRadioQuery(input) {
        return `Fusion2Radio is your ultimate destination for the best music and entertainment. You can tune in to our live stream on our website or through our mobile app.`;
    }

    handleScheduleQuery(input) {
        return `Our programming schedule is available on our website. We have exciting shows throughout the day, featuring various hosts and music genres.`;
    }

    handleBookingQuery(input) {
        return `To make your booking process seamless at Rock Moulds, please email us at rockmoulds@gmail.com with the following details:\n\n` +
               ` Required Information:\n` +
               `• Your full name\n` +
               `• Contact information (phone/email)\n` +
               `• Preferred dates and times\n` +
               `• Service details\n` +
               `• Any special requests\n\n` +
               `Why email?\n` +
               `• Clear communication\n` +
               `• Written documentation\n` +
               `• Flexible timing\n` +
               `• Efficient processing\n\n` +
               `We'll review your request and respond promptly with confirmation or additional questions. Thank you for choosing Rock Moulds! `;
    }

    handleContactQuery(input) {
        return `Thank you for your interest in contacting Rock Moulds! Here's how to reach us effectively:\n\n` +
               `📧 Email: rockmoulds@gmail.com\n\n` +
               `Tips for Effective Communication:\n` +
               `• Be clear and concise in your subject line\n` +
               `• Include relevant details and order numbers if applicable\n` +
               `• Feel free to ask questions about our services\n` +
               `• Share your feedback - we value your opinion!\n\n` +
               `Why Email?\n` +
               `• Documented communication trail\n` +
               `• Send messages anytime, anywhere\n` +
               `• Clear expression of your needs\n` +
               `• Faster response processing\n\n` +
               `We aim to respond promptly to all inquiries. Your communication helps us serve you better! 🎵`;
    }

    handleListenQuery(input) {
        return `Welcome to Rock Moulds! Here's how you can tune in and connect with us:\n\n` +
               `🎮 Watch us Live on Twitch:\n` +
               `https://www.twitch.tv/fusion2radio\n\n` +
               `📧 For updates and inquiries:\n` +
               `rockmoulds@gmail.com\n\n` +
               `Why Connect With Us?\n` +
               `• Watch live DJ performances\n` +
               `• Interact with our community\n` +
               `• Get notified about special events\n` +
               `• Receive exclusive content\n\n` +
               `What to Expect:\n` +
               `• Live streaming sessions\n` +
               `• Interactive chat experience\n` +
               `• Regular updates about our programming\n` +
               `• Access to exclusive content and events\n\n` +
               `Join our community today and be part of the Rock Moulds experience! 🎵🎸`;
    }

    handleFusion2RadioQuery(input) {
        return `Welcome to Fusion2Radio - The Ultimate Online Radio Experience! 🎵\n\n` +
               `🎮 Watch Us Live on Twitch:\n` +
               `https://www.twitch.tv/fusion2radio\n\n` +
               `Meet Our Amazing DJs:\n\n` +
               `🎧 DJ iPro:\n` +
               `• Known for infectious energy and eclectic mixes\n` +
               `• Masters multiple genres from charts to underground\n` +
               `• Creates an immersive atmosphere\n\n` +
               `🎧 DJ Micky:\n` +
               `• Specializes in seamless transitions\n` +
               `• Expert in electronic dance music\n` +
               `• Blends classics with contemporary hits\n\n` +
               `🎧 DJ Fusion:\n` +
               `• Master of genre fusion\n` +
               `• Combines hip-hop, reggae, and indie rock\n` +
               `• Creates boundary-breaking experiences\n\n` +
               `Why Choose Fusion2Radio?\n` +
               `• Interactive live chat experience\n` +
               `• Diverse musical programming\n` +
               `• Themed shows and special events\n` +
               `• Live performances and guest DJs\n` +
               `• Vibrant community atmosphere\n\n` +
               `Join our musical family and let's make radio history together! 🎵🎚️\n` +
               `Contact us: rockmoulds@gmail.com`;
    }

    generateHelpResponse() {
        return `I can help you with:\n- Information about our amazing DJ trio (DJ Micky, DJ Fusion, and DJ IPro)\n- Information about our music and radio programs\n- Current schedule and upcoming shows\n- General inquiries about Fusion2Radio\nJust let me know what you're interested in!`;
    }

    generateGreetingResponse() {
        const timeOfDay = this.getTimeOfDay();
        return `Good ${timeOfDay} ${this.userName}! How can I make your Fusion2Radio experience better today?`;
    }

    generateFarewellResponse() {
        return `Thank you for chatting with me, ${this.userName}! Enjoy the music on Fusion2Radio, and feel free to come back anytime.`;
    }

    generateGeneralResponse(input) {
        const responses = [
            `I understand you're asking about ${input}. Let me help you with that.`,
            `That's an interesting question about ${input}. Let me assist you.`,
            `I'd be happy to help you with information about ${input}.`
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    getTimeOfDay() {
        const hour = new Date().getHours();
        if (hour < 12) return 'morning';
        if (hour < 17) return 'afternoon';
        return 'evening';
    }

    updateContext(input) {
        // Update last topic based on intent
        this.context.lastTopic = this.detectIntent(input);
        
        // Store context in conversation history
        if (this.conversationHistory.length > 10) {
            this.conversationHistory.shift();
        }
    }

    updateUserPreferences(input, response) {
        // Extract and store user preferences
        const preferences = this.context.userPreferences;
        
        if (input.includes('favorite')) {
            if (input.includes('music')) {
                preferences.favoriteMusic = input;
            } else if (input.includes('show')) {
                preferences.favoriteShow = input;
            }
        }
        
        localStorage.setItem('userPreferences', JSON.stringify(preferences));
    }

    updateMicrophoneStatus(message) {
        const micButton = document.getElementById('micButton');
        const statusSpan = micButton.querySelector('.mic-status') || (() => {
            const span = document.createElement('span');
            span.className = 'mic-status';
            micButton.appendChild(span);
            return span;
        })();
        statusSpan.textContent = message;
    }

    addMessage(message, isUser = false) {
        const chatBox = document.querySelector('.chat-box');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
        messageDiv.textContent = message;
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }
};

// Initialize chat only once when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const micButton = document.getElementById('micButton');
    const userInput = document.querySelector('input[name="message"]');
    const form = document.querySelector('form');

    const chatbot = new Chatbot();
    
    // Only ask for name if we don't have it stored
    if (!localStorage.getItem('userName')) {
        chatbot.startChat();
    }

    micButton.addEventListener('click', () => {
        if (!chatbot.isListening) {
            chatbot.startListening();
        } else {
            chatbot.stopListening();
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = userInput.value.trim();
        if (message) {
            chatbot.addMessage(message, true);
            userInput.value = '';
            
            const response = await chatbot.processInput(message);
            if (response) {
                setTimeout(() => {
                    chatbot.addMessage(response);
                    chatbot.speak(response);
                }, 500);
            }
        }
    });

    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            form.dispatchEvent(new Event('submit'));
        }
    });
});
