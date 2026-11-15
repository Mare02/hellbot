const formatReasonLine = (reason) => (reason ? `\nReason: ${reason}.` : '');

const notifyMember = async (member, action, reason) => {
  const text = `You have been ${action} from ${member.guild.name}.${formatReasonLine(reason)}`;
  await member.send(text).catch(() => console.log('Failed to DM user'));
};

module.exports = { notifyMember };
