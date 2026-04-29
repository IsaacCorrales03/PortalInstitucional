the main idea is to divide the system in two splits:
1: the votant
2: the auxiliar 
the votant is the laptop with the capacity to vote, insert the vontant id, select a political party, and finally submit they vote
the auxiliar is one who is supervising the elections, and can accept a vote, he can see the votant id, but he cannot see for who the votant vote

the impletation is using socket.io, and create a room, and after the submit the auxiliar can accept the vote
and it going to add to the db

finally the elecction system is going to use a counter, to know how many votes a election party has

the flow of the process is something like that:
a votant entry to the pollingstation, verifies his identity, use the votant laptop, vote for a 
political party and, after that, the auxiliar proced or decline the vote
the vote is sended to the backend, and the backend is going to analize this stainaments:
1- is valid?
2- for who is the vote?
and after that, it going to add a +1 in respective politican party

añadir preguntas para el debate

roles de miembros asamblea, tribunal, comite y directivas de sección