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


### Limited User
- Added limited user, following good practices.
- Added to sudo permissions

### Firewall
- Set up industry-standard firewall ufw. Cloud firewall to be added later (optional).
- Set up permissions to deny all incoming traffic except ssh and port 8000, where backend is hosted.
- Allow all outgoing traffic
- Allowed firewall to allow port 80 and 443 for HTTP/S respectively.

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
- 

### Database
- Using PostgreSQL for the RDBMS, running on port 5432.
- Installed psycopg2-binary, devs recommend to use just psycopg2 and libpq-dev, to check if the former path causes any issues.
- Set up social_network_db and related privileges and user. Ensure the user created has privileges to alter, create and use both the DBs and schemas.
- Changed django settings.py file to support PostgreSQL.

### Gateway Interface
- Using WSGI for now, switching to ASGI if WebSockets and persistent connections come into play.
- Gunicorn has been set up and linked to Nginx.


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


### Logging
- Logging handled by journalctl for now, will check if something more customized is required.