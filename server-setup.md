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

### Environment
- Set up python and requirements.