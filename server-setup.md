# Server Setup Log

## 2026-01-09

### SSH
- Installed openssh-server
- Kept existing sshd_config during upgrade
- Added SSH public key to server and also added to local machine's SSH agent(keychain).
- Plan: disable password auth after key-only login verified ✅
- Update permissions such that owner of the directory can read, write and update. Owner of the files of the directory can read and write.
- root user not to be used. Convention.

### System
- OS: Ubuntu 22.04
- User: sharad
- SSH access verified

### Notes
- DO NOT restart ssh before confirming new key login
- Port is just a label/number to indicate that a certain service can communicate by using that specific port. 
- Socket is an endpoint(usually a file descriptor), that contains details about the protocols, which a process can use to communicate with another service via the socket.


### Limited User
- Added limited user, following good practices.
- Added to sudo permissions

### Firewall
- Set up industry-standard firewall ufw. Cloud firewall to be added later (optional).
- Set up permissions to deny all incoming traffic except ssh and port 8000, where backend is hosted.
- Allow all outgoing traffic
- Allowed firewall to allow port 80 and 443 for HTTP/S respectively.
- Allowed incoming traffic onto Nginx, bascially enabling it's role as a reverse proxy.

### Environment
- Set up python3 and requirements.
- Set up npm and node, set up npm run build

### Web Server & Reverse Proxy
- Installed Nginx to serve static files.
- Listening to port 80(HTTP for now)
- Accepting traffic matching any hostname (Later gonna be domain name).
- Provided the root directory from which to read from.
- Provided react routing support on refresh for SPAs.
- Symlinked sites-available and sites-enabled, to maintain seperation and to handles updates cleanly.
- Set up reverse proxy to ensure all /api/ requests are forwarded to gunicorn and subsequently Django, and all / requests are served from nginx itself.

### Database
- Using PostgreSQL for the RDBMS, running on port 5432.
- Installed psycopg2-binary, devs recommend to use just psycopg2 and libpq-dev, to check if the former path causes any issues.
- Set up social_network_db and related privileges and user. Ensure the user created has privileges to alter, create and use both the DBs and schemas.
- Changed django settings.py file to support PostgreSQL.

### Gateway Interface
- Using WSGI for now, switching to ASGI if WebSockets and persistent connections come into play.
- Gunicorn has been set up and linked to Nginx.
- Unix domain socket created by systemd at start/restart. Nginx talks to Gunicorn via this socket. No longer uses the 8000 TCP port for communication. This is because this socket's protocols are faster than TCP, unsure about the exact details. Recommended by Gunicorn.
- Added a Uvicorn worker in the Gunicorn manager, to allow for async tasks to run in the event loop with the speed and reliability of Gunicorn.
- Why this matters:
- The Worker Class: Without --worker-class uvicorn.workers.UvicornWorker, Gunicorn defaults to its sync worker. It will try to run your code line-by-line and will choke if you try to use WebSockets or high-concurrency async features later.
- ASGI: WSGI is the "old" synchronous standard. ASGI is the "new" asynchronous standard. Since Uvicorn is an ASGI server, it needs to hook into project4.asgi:application. Uses event loops unlike Gunicorn's blocking workers.


### Process manager
- Using Linux's process manager(systemd) to automate Gunicorn on reboot, to handle restarts, to run in background, to centralize logging and to handle controlled restarts and deploys.
- systemctl is how you talk to systemd. The other being journalctl.
- targets are ways of managing relationships between different units, to handle any dependencies of services(like nginx and network and stuff) during boot or other phases. Always use the ordering system in the service you want to use instead of adding to the dependency file that a certain service can be used after this dependency is activated. i.e for multi-user.target, you don't want to add nginx.service can be used to it, instead to nginx.service, you add that it Requires multi-user.target.
- systemd dependencies can have multiple levels of enforces i.e
- Wants, WantedBy (Activate these targets/services together, no big deal if you don't)
- Requires, RequiresBy (Must activate these units TOGETHER, does not mean that one service has to be activated before or after the other, i.e dependency order is not enforced)
- Explicit Ordering (Before, After) (This enforces that one service/target must be activated before/after another one. Strongest Ordering possible, literally sets the order.)
- If you're not explicit about it, systemd figures out the order by itself.
- Set up gunicorn.service to run on boot and created symlink between multi-user.target/wants and gunicorn.service
- Will restart on any crash.
- Unit started after network.target
- Unix domain socket created by systemd at start/restart.

### Domain name
- Bought a domain name off Hostinger, thewarpnetwork.com
- Named after the Warp in Warhammer 40k.
- Added an A record which points to public IP address.
- CNAME which allows for the www. alias to point to the A record.
- CAA record which allows for certain companies to issue a security badge.
- TXT record used for mailjet to validate domain.
- SPF (SPF tells mail servers that these specific servers are allowed to send mail using thewarpnetwork.com) and DKIM(DKIM adds a cryptographic signature to every email you send. Mailjet provides a unique key for this. It stores a private key which it uses to sign every email. The mail receiver does a DNS lookup, finds the public key and decrypts the mail, confirming that it has not been tampered with) set up using values provided by Mailjet.
- Newer security fallback, DMARC also provided. 

### Logging
- Logging handled by journalctl for now, will check if something more customized is required.

### Mail Service
- Using Mailjet API because it has a very generous Free tier, no credit card required.
- Linode has an external firewall that blocks SMTP ports due to spam and security issues. Email providers use the web port.
- Appropriate Domain set up has been done.

### Cleanup
- Set up a cron job to flush expired refresh tokens every day at midnight.

### Other security features
- Decided not use CSRF checks, because Django DRF rejects CSRF anyway, assuming you're using session based auth
- The async views which might need CSRF don't really need to do so, because all those views are only when the user is logged out.
- CORS, XSS injections are handled as per best practices
- Dangerously set innerHTML to be looked into.
- HTTPS set up by CertBot and configured in Nginx.

### Rate Limiting
- Currently enforcing a global rate limit via nginx.
- To implement per view rate limiting via Django's rate limit feature
- rate=10r/s/ip
- burst=15, If browser makes 15 reqs at once, to load a page, nginx allows them.
- nodelay tells nginx to process the burst immediately rather than making the user wait for each request.
- (base) ➜  ~ seq 50 | xargs -I{} -P 10 curl -sI https://www.thewarpnetwork.com/api/send_verification | grep HTTP; to check for rate limits.

### Message queuing and caching
- Nothing needed as of now, if requests get exponentially more and stuff, probably have to.
- Caching also is unnecessary as of now.


### Race conditions
- The race conditions mentioned here are frontend/backend discrepancies, not DB race conditions:
1. Auth context checking and Profile loading: Filling up Auth Context via backend API call was taking longer than the loading of profile, which caused user to be logged out. Fix: Employed a spinner and made use of the loading hook in Authcontext to ensure page loads after AuthContext has been filled.
2. The race condition occurred because the logout() function is an asynchronous network request that takes time to delete the server-side session cookie, but the frontend's Maps("/login") was firing instantly before that deletion finished. Upon arriving at the login route, the GuestGuard component checked the still-active authentication state, incorrectly identified the user as still logged in, and immediately bounced them back to the Home page. Consequently, the Home page would mount and fetch data using the not-yet-cleared cookie, leading to the "ghost" behavior where a supposedly logged-out user could still see their private interactions and liked posts.

The Fix: Use await logout() to force the browser to finish the cookie deletion and state reset before the navigation logic is allowed to execute.