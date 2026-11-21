    // ========================================================================
    // Real managers, from Wikipedia
    // ========================================================================

    // Living world in the Career tab: your club, the clubs on the table and the latest moves

    const REP_SHORT = ['LEAGUE', 'CONT.', 'WORLD'];
    const REP_HINTS = ['How strong it is at home (league and cup chances)', 'How strong it is in continental cups', 'How known it is worldwide (who it signs, playing time)'];
    let lastWorldSig = '';
    // Managers: real ones. Every club starts with its real manager and every national team with its real head coach;
    // a club or country that changes manager hires a real one who is out of work. Stars (1-5) come from the size of the
    // club (or country) they run or last ran, nothing else about the person.

    // Read from English Wikipedia on 3 November 2026 (CC BY-SA 4.0): each league's 2026-27 (or 2026) season article,
    // its "Personnel" and "Managerial changes" tables and the season before's (e.g. "2026–27 La Liga"), and "List of
    // current national association football team managers". A few small leagues have no table there (Panama, Costa Rica,
    // Honduras, South Africa, Argentina's lower leagues…): their clubs start with an out-of-work manager instead.
    // Made by a build script outside this file (CLAUDE.md, Managers): re-run it to bring the data up to date.
    // REAL_CLUB_MANAGERS: club id|FIFA code of the manager's country ('' when Wikipedia gives none)|name
    // REAL_NATION_MANAGERS: national team's FIFA code|manager's country|name
    // FREE_MANAGERS: country|name|the Copero club he last ran (left it, or ran it last season, and has no job now)
    const REAL_CLUB_MANAGERS = `
2-de-mayo|PAR|Eduardo Ledesma
a-italiano|ARG|Patricio Graff
Aalesund|NOR|Kjetil Rekdal
abb|BOL|Jaime Jemio
aberdeen|NIR|Stephen Robinson
abha|CRO|Damir Burić
abia-warriors||Imama Amapakabo
ac-milan|POR|Ruben Amorim
ac-sparta-praha|DEN|Brian Priske
academia-anzoategui|ARG|Marcelo Zuleta
academico-viseu|POR|Bruno Pinheiro
ad-ceuta-fc|ESP|José Juan Romero
adelaide-united|BRA|Airton Andrioli
adt-peru|PER|Víctor Rivera
ae-kifisia|ARG|Sebastián Leto
aek-atenas|SRB|Marko Nikolić
agf|DEN|Jakob Poulsen
aguila|ARG|Santiago Davio
aguilas-doradas|ARG|Flavio Robatto
aguilas-espana|ESP|Adrián Hernández
aik|ESP|José Riveiro
ajax|ESP|Míchel
akhmat|RUS|Rolan Gusev
akron|SRB|Srđan Blagojević
al-ahli|BIH|Marino Pušić
al-ahly|DEN|Jess Thorup
al-ettifaq|AUS|Arthur Papas
al-faisaly-fc|ITA|Giovanni Solinas
al-fateh|MAR|Jamal Sellami
al-fayha|BRA|Fábio Carille
al-hazem|TUN|Jalel Kadri
al-hilal|ITA|Simone Inzaghi
al-ittihad|GER|Jens Wissing
al-ittihad-alexandria|EGY|Miloud Hamdi
al-khaleej|POR|José Gomes
al-kholood|ENG|Des Buckingham
al-masry|EGY|Khaled Galal
al-mokawloon-al-arab|EGY|Samy Qumsan
al-nassr|AUS|Ange Postecoglou
al-qadsiah|NIR|Brendan Rodgers
al-riyadh|BRA|Maurício Dulac
al-shabab|GER|Thomas Letsch
al-taawoun|SRB|Vuk Rašović
alacranes-durango|MEX|Héctor Jair Real
alanyaspor|POR|João Pereira
alaves|ESP|Quique Sánchez Flores
albacete|ESP|Joseba Etxeberria
albion|URU|Federico Macías
alcorcon|ESP|Fran Justo
aldosivi|ARG|Javier Sanguinetti
alebrijes-oaxaca|MEX|Gonzalo Bolaños
algeciras|ESP|Adrián Colunga
alianza|COL|Flabio Torres
alianza-atletico|ARG|Federico Urciuoli
alianza-fc|ARG|Roberto Pompei
alianza-lima|ARG|Pablo Guede
alianza-universidad|PER|Roberto Mosquera
almeria|ESP|García Pimienta
aluminium-arak|IRN|Pirouz Ghorbani
alverca|POR|Sérgio Ferreira
always-ready|PAR|Pablo Godoy
amedspor|KOS|Besnik Hasi
america-de-cali|COL|David González
america-mineiro|BRA|Moacir Júnior
anderlecht|POR|Vítor Bruno
angers|FRA|Stéphane Gilli
annecy|FRA|Laurent Guyot
antequera|ESP|Abraham Paz
antigua|ARG|Mauricio Tapia
anyang|KOR|Ryu Byeong-hoon
arema-fc|BRA|André Caldas
arenas-club|ESP|Jon Erice
argentinos-jrs|ARG|Nicolás Diez
arges-pitesti|ROU|Bogdan Andone
aris-thessaloniki|GRE|Michalis Grigoriou
arouca|POR|Vítor Severino
arsenal|ESP|Mikel Arteta
arsimi|MKD|Vildan Saliu
as-far|POR|Pedro Gonçalves
as-roma|ITA|Gian Piero Gasperini
asteras-tripolis|POR|Gonçalo Feio
aston-villa|ESP|Unai Emery
atalanta|ITA|Maurizio Sarri
athletic-brasil|BRA|Alex
atlanta-united|ARG|Gerardo Martino
atlante-fc|MEX|Miguel Herrera
atlantico-dominicana|VEN|Miguel Ángel Acosta
atlas|ARG|Hernán Crespo
atletico-balboa|SLV|Carlos Romero
atletico-goianiense|BRA|Roger Silva
atletico-grau|ARG|Gerardo Ameli
atletico-la-paz|ARG|Hugo Castillo
atletico-madrid|ARG|Diego Simeone
atletico-mg|ARG|Eduardo Domínguez
atletico-morelia|ARG|Hugo Colace
atletico-nacional|COL|Lucas González
atletico-paranaense|BRA|Odair Hellmann
atletico-san-luis|MEX|Diego Mejía
atletico-tembetary|PAR|Luis Fernando Escobar
atletico-torque|URU|Marcelo Méndez
atletico-tucuman|ARG|Julio César Falcioni
atletico-vega-real|CUB|Raul Gonzalez
atromitos|BIH|Dušan Kerkez
aucas|ECU|Norberto Araujo
auckland-city|CZE|Rudy Mozr
auckland-fc|POR|Pedro Moreira
auckland-united|USA|Ben Sippola
aurora|CRC|Saúl Phillip
aurora-bolivia|URU|Enrique Díaz
austin-fc|USA|Davy Arnaud
austria-lustenau|AUT|Markus Mader
austria-wien|AUT|Stephan Helm
auxerre|BEL|Will Still
avai|BRA|Marquinhos
avellino|ITA|Alessandro Nesta
avispa-fukuoka|KOR|Kim Myung-hwi
ayacucho-fc|ARG|Sergio Castellanos
az|NED|Lee-Roy Echteld
bahia|BRA|Rogério Ceni
bali-united|NED|Johnny Jansen
baltika|RUS|Andrey Talalayev
banfield|ARG|Pedro Troglio
banik-ostrava|CZE|Roman Skuhravý
barakaldo|ESP|Imanol de la Sota
barau-fc||Eugene Agagbe
barcelona|GER|Hansi Flick
barcelona-sc|ARG|Pablo Trobbiani
bari|ITA|Moreno Longo
barracas-central|ARG|Damián Ayude
basaksehir|TUR|Nuri Şahin
bashkimi|MKD|Gajur Rexhepi
beijing-guoan|SCO|Nick Montgomery
belgrano|ARG|Ricardo Zielinski
bendel-insurance||Kennedy Boboye
benfica|POR|Marco Silva
besiktas|ITA|Vincenzo Italiano
bhayangkara-presisi-lampung|ESP|Óscar Bruzón
birkenhead-united|ENG|Paul Hobson
birmingham|WAL|Chris Davies
bk-hacken|SWE|Jens Gustafsson
blackburn|ENG|Tony Mowbray
blooming|ARG|Cristian Paulucci
boca-juniors|ARG|Rodolfo Arruabarrena
bodo-glimt|NOR|Kjetil Knutsen
bohemians-praha|CZE|Jaroslav Veselý
bolivar|COL|Alejandro Restrepo
bologna|ITA|Raffaele Palladino
bolton|ENG|Steven Schumacher
borneo-samarinda|POR|Mauro Jerónimo
boston-river|URU|Jorge Cazulo
botafogo|BRA|Tite
botafogo-fc|BRA|Cláudio Tencati
botosani|ROU|Marius Croitoru
boulogne|FRA|Fabien Dagneaux
bournemouth|GER|Marco Rose
boyaca-chico|COL|Jhon Jaime Gómez
brann|NOR|Eirik Horneland
bregalnica-stip|MKD|Nikola Kuzmanov
brentford|IRL|Keith Andrews
brighton|GER|Fabian Hürzeler
brisbane-roar|AUS|Michael Valkanis
bristol-city|ENG|Michael Skubala
brondby-if|DEN|Thomas Nørgaard
bsc-young-boys|SUI|Gerardo Seoane
bucaramanga|URU|Pablo Peirano
bucheon-1995|KOR|Lee Young-min
bukovyna-chernivtsi|UKR|Serhiy Shyshchenko
burgos|ESP|Sergio Francisco
burnley|SUI|Fabio Celestini
cacahuatique|ARG|Ángel “Nino” Piazzi
cacereno|ESP|Julio Cobos
cadiz|ESP|Borja Jiménez
cagliari|ITA|Fabio Pisacane
cajamarca|PAR|Celso Ayala
cambuur|NED|Johan Plat
cancun-fc|ECU|Miguel Bravo
carabobo-fc|VEN|Daniel Farías
caracas-fc|VEN|Noel Sanvicente
cardiff|IRL|Brian Barry-Murphy
carrarese|ITA|Guido Pagliuca
cartagena-espana|ESP|Iñigo Vélez
casa-pia|POR|Filipe Coelho
castellon|ESP|Pablo Hernández
catanzaro|ITA|Michele Mignani
caykur-rizespor|TUR|Recep Uçar
cd-coria|ESP|Rai Rosa
ce-europa|ESP|Luis Blanco
ceara|BRA|Daniel Paulista
celta-vigo|ESP|Claudio Giráldez
celtic|NIR|Martin O'Neill
central-coast-mariners|MLT|John Hutchinson
central-cordoba-de-santiago|ARG|Sebastián Domínguez
central-espanol|URU|Antonio Pacheco
cercle-brugge|DEN|Lars Friis
cerezo-osaka|ESP|Pablo Machín
cerro|URU|Alejandro Cappuccio
cerro-largo|URU|Bruno Silva
cerro-porteno|ARG|Gustavo Costas
cesena|ITA|Alessandro Diamanti
cf-montreal|FRA|Philippe Eullaffroy
cf-pachuca|MEX|Benjamín Mora
cfr-cluj|ROU|Marius Șumudică
chadormalu-ardakan|IRN|Saeid Akhbari
chapecoense|BRA|Rafael Lacerda
charlotte-fc|ENG|Dean Smith
charlton|WAL|Nathan Jones
chelsea|ESP|Xabi Alonso
chengdu-rongcheng|AUS|John Aloisi
chicago-fire-fc|USA|Gregg Berhalter
chornomorets-odesa|UKR|Roman Hryhorchuk
christchurch-united|NZL|Daniel Godden
cibao|ARG|Gabriel Martínez Poch
cienciano|ARG|Horacio Melgarejo
clermont-foot|FRA|David Guion
club-america|URU|Guillermo Almada
club-brugge|CRO|Ivan Leko
club-guarani|PAR|Francisco Arce
club-nacional|URU|Daniel Carreño
club-queretaro|CHI|Esteban González
club-tijuana|URU|Sebastián Abreu
coastal-spirit|NZL|Robert Stanton
coban-imperial|MEX|José Luis Trejo
cobresal|CHI|Gustavo Huerta
cod-meknes|POR|Jorge Paixão
colo-colo|ARG|Fernando Ortiz
colorado-rapids|ENG|Matt Wells
columbus-crew|FRA|Laurent Courtois
comerciantes-unidos|ARG|Claudio Biaggio
como|ESP|Cesc Fàbregas
comunicaciones|MEX|Roberto Hernández
coquimbo-unido|CHI|Hernán Caputto
cordoba|ESP|Iván Ania
corinthians|NED|Clarence Seedorf
coritiba|BRA|Guilherme Bossle
correcaminos-uat|ARG|Gabriel Pereyra
corum-fk|TUR|Burak Yılmaz
corvinul-hunedoara|ROU|Florin Maxim
coventry|ENG|Frank Lampard
cracovia|SWE|Bartosz Grzelak
crb-brasil|BRA|Fábio Matias
cremonese|ITA|Fabio Pecchia
criciuma|BRA|Umberto Louzer
cruz-azul|MEX|Joel Huiqui
cruz-azul-hidalgo|COL|Esteban Landazábal
cruzeiro|POR|Artur Jorge
crvena-zvezda|ESP|Albert Riera
crystal-palace|FRA|Pierre Sage
csikszereda|ROU|Valentin Suciu
cska-moscow|RUS|Dmitry Igdisamov
cucuta-deportivo|ARG|Nicolás Chiesa
cuiaba|BRA|Eduardo Barros
cultural-leonesa|ESP|Jandro Castro
cusco|ESP|Javier Rabanal
daejeon-hana-citizen|KOR|Hwang Sun-hong
dalian-yingbo|CHN|Li Guoxu
danubio|URU|Leonel Rocco
dc-united|SUI|René Weiler
defensa-y-justicia|ARG|Julio Vaccari
defensor-sporting|URU|Mauricio Larriera
degerfors-if|ERI|Henok Goitom
delfin-ecuador|ECU|Juan Carlos León
delfines-del-este|DOM|Edward Acevedo
den-haag|NED|Levi Schwiebbe
deportes-concepcion|CHI|Fernando Díaz
deportes-iquique|CHI|Rodrigo Guerrero
deportes-la-serena|CHI|Felipe Gutiérrez
deportes-limache|CHI|Víctor Rivero
deportes-tolima|COL|Luis Fernando Suárez
deportivo-binacional|PER|Claudio Bustamante
deportivo-cali|VEN|Rafael Dudamel
deportivo-cuenca|ARG|Andrés Yllana
deportivo-garcilaso|ARG|Lisandro Greppo
deportivo-la-coruna|ESP|Antonio Hidalgo
deportivo-la-guaira|VEN|Mariano Rodríguez
deportivo-maldonado|ARG|Gabriel Di Noia
deportivo-mixco|GUA|Fabricio Benítez
deportivo-moquegua|PER|José Soto
deportivo-pasto|ESP|Diego Merino
deportivo-pereira|COL|Alexis Márquez
deportivo-recoleta|PAR|Jorge González
deportivo-riestra|ARG|Gustavo Benítez
deportivo-tachira-fc|URU|Álvaro Recoba
derby|ENG|John Eustace
dewa-united|BRA|Osmar Loss
difaa-hassani-el-jadidi|POR|Ricardo Chéu
dijon|FRA|Baptiste Ridira
dinamo-bucuresti|POR|Nuno Campos
dinamo-zagreb|CRO|Jerko Leko
diriangen|CRC|Alexander Vargas
diriyah-club|POR|Bruno Lage
djurgardens-if|FIN|Jani Honkavaara
doma-united||Deji Ayeni
dorados-de-sinaloa|MEX|Luis Orozco
dundee|SCO|Steven Pressley
dundee-united|IRL|Jim Goodwin
dunkerque|ESP|Albert Sánchez
dynamo-kyiv|POL|Maciej Kędziorek
dynamo-makhachkala|RUS|Vadim Yevseyev
dynamo-moscow|GER|Sandro Schwarz
eibar|ESP|Jokin Aranbarri
el-nacional|ECU|Juan Carlos Pérez
elche|ARG|Martín Anselmi
eldense|ESP|Javier Calleja
emelec|ARG|Ezequiel Medrán
empoli|ITA|Matteo Andreoletti
envigado|COL|Andrés Orozco
enyimba||Emmanuel Deutsch
epitsentr|UKR|Serhiy Nahornyak
erzurumspor|TUR|Serkan Özbalta
espanyol|ESP|Eder Sarabia
estac-troyes|FRA|Stéphane Dumont
esteghlal|IRN|Sohrab Bakhtiarizadeh
esteghlal-khuzestan|IRN|Amir Khalifeh-Asl
estoril|POR|Sérgio Raimundo
estrela-amadora|POR|Pepa
estudiantes|URU|Alexander Medina
estudiantes-de-rio-cuarto|ARG|Rubén Forestello
estudiantes-merida|VEN|Jesús Gómez
everton|SCO|David Moyes
everton-chile|ARG|Walter Ribonetto
excelsior|NED|Ruben den Uil
extremadura|ESP|David Rocha
eyupspor|TUR|Mustafa Dalcı
fagiano-okayama|JPN|Takashi Kiyama
fajr-sepasi|IRN|Rasoul Khatibi
fakel|RUS|Aleksei Rebko
falkirk|SCO|John McGlynn
famalicao|POR|Ricardo
farul-constanta|ROU|Ioan Ovidiu Sabău
fas|MEX|Adrian Sanchez
fath-union-sports-rabat|POR|Ricardo Formosinho
fbc-melgar|ARG|Miguel Rondelli
fc-andorra|ESP|Carles Manso
fc-basel|SRB|Slaviša Jokanović
fc-cincinnati|USA|Pat Noonan
fc-copenhagen|DEN|Bo Svensson
fc-dallas|USA|Eric Quill
fc-juarez|ARG|Gustavo Lema
fc-kharkiv|CRO|Mladen Bartulović
fc-luzern|SUI|Jörg Portmann
fc-midtjylland|DEN|Mike Tullberg
fc-nordsjaelland|DEN|Jens Fønsskov Olsen
fc-seoul|KOR|Kim Gi-dong
fc-steaua-bucuresti|ROU|Florin Bratu
fc-thun|SUI|Gian-Luca Privitelli
fc-tokyo|JPN|Rikizo Matsuhashi
fc-zbrojovka-brno|CZE|Martin Svědík
fc-zurich|SUI|Marcel Koller
fenerbahce|NED|Dirk Kuyt
feyenoord|NED|Giovanni van Bronckhorst
fiorentina|ITA|Paolo Vanoli
fk-cukaricki|SRB|Marko Jakšić
fk-imt|SRB|Zoran Popović
fk-mladost-lucani|SRB|Radovan Ćurčić
fk-novi-pazar|SRB|Strahinja Pandurović
fk-partizan|SRB|Saša Ilić
fk-vojvodina|SRB|Marko Savić
fk-zemun|MKD|Gjorgji Mojsov
flamengo|POR|Leonardo Jardim
fluminense|BRA|Marcão
foolad|IRN|Hamid Motahari
fortaleza|BRA|Paulo Autuori
fortaleza-ceif|COL|Diego Arias
fortuna-sittard|NED|Danny Buijs
frosinone|ITA|Massimiliano Alvini
fuerte-san-francisco|SLV|Omar Sevilla
fulham|ESP|Álvaro Arbeloa
gais|SWE|Fredrik Holmberg
galatasaray|TUR|Okan Buruk
gamba-osaka|JPN|Tomokazu Myojin
gangwon|KOR|Chung Kyung-ho
gaziantep|TUR|Orhan Ak
genclerbirligi|GER|Bernd Storck
general-caballero-jlm|PAR|Humberto Ovelar
genoa|ITA|Daniele De Rossi
getafe|ESP|José Bordalás
gil-vicente|POR|Luís Pinto
gimcheon-sangmu|KOR|Ju Seung-jin
gimnasia-lp|ARG|Ariel Pereyra
gimnasia-m|ARG|Darío Franco
gimnastic|ESP|Xisco Campos
girona|ESP|Quique Álvarez
gks-katowice|POL|Rafał Górak
go-ahead-eagles|NED|Joseph Oosting
godoy-cruz|ARG|Omar Asad
goias|BRA|Mozart
gol-gohar|IRN|Mehdi Rahmati
gorica|CRO|Mario Carević
gornik-zabrze|SVK|Michal Gašparík
goztepe|BUL|Stanimir Stoilov
granada-cf|ESP|Pacheta
grasshopper|GER|Peter Zeidler
grazer-ak|AUT|Gerald Scheiblehner
gremio|BRA|Renato Gaúcho
gremio-novorizontino|BRA|Enderson Moreira
grenoble|FRA|Olivier Frapolli
groningen|NED|Dick Lukkien
guabira|BOL|Leonardo Eguez
guadalajara-chivas|ARG|Gabriel Milito
guastatoya|URU|Ariel Sena
guayaquil-city|ECU|Pool Gavilánez
guingamp|FRA|Sylvain Ripoll
gwangju|KOR|Lee Jung-kyu
hajduk-split|URU|Gonzalo García
halmstads-bk|SCO|Stuart Baxter
hamarkameratene|NOR|Thomas Myhre
hammarby-if|SWE|Henrik Rydström
hartberg|AUT|Markus Schopp
hassania-agadir|MAR|Hilal Et-Tair
hearts|BEL|Wouter Vrancken
heerenveen|NED|Robin Veldman
henan-songshan-longmen|POR|Daniel Ramos
hercules|ESP|Beto Company
hibernian|NED|Marink Reedijk
horsens|DEN|Niki Zimling
houston-dynamo|USA|Ben Olsen
hradec-kralove|CZE|David Horejš
huachipato|CHI|Jaime García
huesca|ESP|Albert Rudé
hull-city|BIH|Sergej Jakirović
huracan|ARG|Diego Martínez
if-brommapojkarna|SWE|Ulf Kristiansson
if-elfsborg|SWE|Björn Hamberg
ifk-goteborg|SWE|Joachim Björklund
ik-sirius|SWE|Andreas Engelmark
ik-start|NOR|Azar Karadas
ikorodu-city||Bright Ozebagbe
inca-aruba|SLV|Alcides Salazar
incheon-united|KOR|Yoon Jong-hwan
independiente|BRA|Jadson Viera
independiente-del-valle|URU|Joaquín Papa
independiente-medellin|COL|Luis Amaranto Perea
independiente-petrolero|BOL|Juan Pablo Grass
independiente-rivadavia|ARG|Alfredo Berti
instituto-cordoba|ARG|Diego Flores
inter-lagos||Shakiru Biodun Giwa
inter-miami|ARG|Kily González
inter-santa-tecla|CRC|Luis Marin
internacional|BRA|Eduardo Baptista
internacional-bogota|ARG|Ricardo Valiño
ipswich|ENG|Gary O'Neil
ir-tanger|ALG|Abdelhak Benchikha
iraklis|ITA|Walter Mazzarri
isenmulang-kalteng|IDN|Mundari Karya
isidro-metapan|ARG|Gabriel Alvarez
istra-1961|ESP|Javier Cabello
jablonec|CZE|Luboš Kozel
jagiellonia-bialystok|POL|Adrian Siemieniec
jaguares|COL|Julio Méndez
jaiba-brava|ARG|Miguel Ángel Martínez
jalapa|COL|Javier Londoño
jarabacoa|COL|Carlos Echeverry
jef-united-chiba|JPN|Yoshiyuki Kobayashi
jeju|POR|Sérgio Costa
jeonbuk|KOR|Chung Jung-yong
juan-pablo-ii|PER|Jorge Araujo
junior|URU|Sebastián Viera
juve-stabia|ITA|Pietro De Giorgio
juventud|URU|Sergio Blanco
juventud-torremolinos|SWE|Junes Barny
juventude|BRA|Maurício Barbieri
juventus|ITA|Luciano Spalletti
kaa-gent|BEL|Rik De Mil
kalamata|GRE|Panagiotis Christofileas
kalmar-ff|FIN|Toni Koskela
kano-pillars||Daniel Ogunmodede
karpaty-lviv|ESP|Fran Fernández
kashima-antlers|JPN|Toru Oniki
kashiwa-reysol|ESP|Ricardo Rodríguez
kasimpasa|TUR|Emre Belözoğlu
katsina-united||Azeez Audu Mohammed
kawasaki-frontale|JPN|Shigetoshi Hasebe
kawkab-marrakech|MAR|Youssef Safri
kfum|NOR|Jørgen Isnes
kheybar-khorramabad|IRN|Faraz Kamalvand
kilmarnock|SCO|Neil McCann
kocaelispor|TUR|Selçuk İnan
kolos-kovalivka|UKR|Ruslan Kostyshyn
konyaspor|TUR|İlhan Palut
korona-kielce|POL|Robert Kolendowicz
krasnodar|RUS|Murad Musayev
krc-genk|DEN|Jess Thorup
kristiansund|NOR|Amund Skiri
krylya-sovetov|RUS|Sergei Bulatov
kryvbas-kryvyi-rih|UKR|Oleksandr Petrakov
kudrivka|UKR|Oleksandr Protchenko
kun-khalifat||Obinna Uzoho
kv-mechelen|BEL|Frederik Vanderbiest
kvc-westerlo|BEL|Issame Charaï
kwara-united||Ashifat Suleiman
kyoto-sanga|SRB|Ranko Popović
lanus|ARG|Mauricio Pellegrino
las-palmas|ESP|Albert Sánchez
lask|AUT|Dietmar Kühbauer
lausanne-sport|SVN|Luka Elsner
laval|FRA|David Vignes
lazio|ITA|Gennaro Gattuso
ldu-de-quito|ARG|Gustavo Álvarez
le-havre|FRA|Jair Karam
le-mans|FRA|Patrick Videira
lecce|ITA|Eusebio Di Francesco
lech-poznan|DEN|Niels Frederiksen
leeds|GER|Daniel Farke
leganes|ESP|Luis Carrión
legia-warszawa|POL|Marek Papszun
lens|FRA|Yannick Cahuzac
leon|ARG|Javier Gandolfi
leones-ecuador|ARG|Matías Córdoba
leones-negros|MEX|Alfonso Sosa
levadiakos|CYP|Elias Charalambous
levante|POR|Luís Castro
liaoning-tieren|KOR|Seo Jung-won
libertad|ARG|Jorge Célico
libertad-asuncion|PAR|Ariel Galeano
lille|ITA|Davide Ancelotti
lillestrom|NOR|Hans Erik Ødegaard
lincoln|ENG|Chris Cohen
liverpool|ESP|Andoni Iraola
liverpool-montevideo|URU|Jorge Fossati
livyi-bereh|UKR|Oleksandr Ryabokon
llaneros|COL|Wilmer Sandoval
lnz-cherkasy|UKR|Vitaliy Ponomaryov
lokomotiv-moscow|RUS|Mikhail Galaktionov
lokomotiva-zagreb|CRO|Nikica Jelavić
londrina|BRA|Hugo Chacon
lorient|FRA|Alexandre Dujeux
los-angeles-fc|ESP|Xavi Tamarit
los-angeles-galaxy|USA|Greg Vanney
los-chankas|PER|Juan Carlos Bazalar
lugo|ESP|Borja Fernández
luis-angel-firpo|CRC|Marvin Solano Abarca
lyngby|DEN|Andreas Bjelland
macara|URU|Guillermo Sanguinetti
macarthur-fc|AUS|Sasa Ognenovski
machida-zelvia|JPN|Go Kuroda
macva-sabac|SRB|Nemanja Glušica
madura-united|POR|Zé Gomes
maghreb-de-fez|POR|Rui Almeida
malacateco|MEX|José Guadalupe Cruz
malaga|ESP|Juan Francisco Funes
malavan|IRN|Maziar Zare
mallorca|ESP|Luis García
malmo-ff|NOR|Gaute Helstrup
malut-united|IDN|Hendri Susilo
managua|ARG|Daniel Corti
manchester-city|ITA|Enzo Maresca
manchester-united|ENG|Michael Carrick
manta|PAR|Raúl Duarte
mantova|ITA|Francesco Modesto
maritimo|NED|Mitchell van der Gaag
marquense|CRC|Hernán Medford
matagalpa|ARG|Roberto Chanampe
melbourne-city|AUS|Aurelio Vidmar
melbourne-victory|VEN|Giovanni Savarese
merida|ESP|Fran Beltrán
mes-shahr-babak|IRN|Ghasem Shahba
metropolitanos-fc|VEN|Francesco Stifano
metz|FRA|Grégory Proment
middlesbrough|SWE|Kim Hellberg
millonarios|COL|Alberto Gamero
millwall|SCO|Alex Neil
mineros-zacatecas|MEX|Luis Ángel Muñoz
minnesota-united|NZL|Cameron Knowles
miramar-misiones|URU|Bernardo Giordano
miramar-rangers|ENG|Jamie O’Connor
mirandes|ESP|Aday Benítez
mirassol|BRA|Rafael Guanaes
mito-hollyhock|JPN|Naoki Mori
mjallby-aif|SWE|Andreas Brännström
mlada-boleslav|CZE|Aleš Majer
moca|VEN|Jean Carlos Güell
modena|ITA|Daniele Galloppa
modern-sport|EGY|Ahmed Samy
molde|NOR|Sindre Tjelmeland
monaco|BRA|Filipe Luís
monagas-sc|VEN|Jesús Ortiz
monterrey|ARG|Matías Almeyda
montevideo-wanderers|URU|Mathías Corujo
montpellier|FRA|Zoumana Camara
monza|CRO|Ivan Jurić
moreirense|POR|Vasco Botelho da Costa
motherwell|SWE|Alfred Johansson
motor-lublin|POL|Mariusz Misiura
municipal|GUA|Mario Acevedo
municipal-limeno|SLV|Jorge Rodriguez
mushuc-runa|ECU|Paúl Vélez
nacional-asuncion|ARG|Víctor Bernay
nacional-por|POR|João Henriques
nacional-potosi|BOL|Dayler Gutiérrez
nagoya-grampus|SRB|Mihailo Petrović
nancy|FRA|Oswald Tanchot
nantes|FRA|Grégory Poirier
napoli|ITA|Massimiliano Allegri
nasarawa-united||Mbwas Mangut
nashville-sc|USA|B.J. Callaghan
nassaji-mazandaran|IRN|Mojtaba Hosseini
national-bank-of-egypt|EGY|Ayman Remady
nautico-brasil|BRA|Bruno Pivetti
nec|NED|Dick Schreuder
necaxa|URU|Martín Varini
neom-sc|FRA|Christophe Galtier
new-england-revolution|SRB|Marko Mitrović
new-york-city-fc|NED|Pascal Jansen
new-york-rb|USA|Michael Bradley
newcastle|GER|Matthias Jaissle
newcastle-jets|AUS|Mark Milligan
newells-old-boys|ARG|Frank Kudelka
nice|FRA|Olivier Pantaloni
niger-tornadoes||Kabiru Dogo
norwich|BEL|Philippe Clement
nottingham-forest|AUT|Oliver Glasner
nublense|CHI|Vicente Núñez
obolon-kyiv|UKR|Oleksandr Antonenko
odense-boldklub|DEN|Thomas Thomasberg
ofi|GRE|Christos Kontis
ofk-beograd|MNE|Radoslav Batak
ohiggins|ARG|Lucas Bovaglio
olimpia|ARG|Pablo Sánchez
olympiacos|ESP|Imanol Alguacil
olympique-de-marseille|FRA|Bruno Genesio
olympique-lyonnais|POR|Paulo Fonseca
once-caldas|COL|Carlos Valencia
operario-ferroviario|BRA|Alberto Valentim
orenburg|RUS|Ildar Akhmetzyanov
orense-sc|COL|Juan Pablo Buch
orgryte-is|SWE|Andreas Holmberg
oriente-petrolero|PAR|Gustavo Florentín
orlando-city|ARG|Martín Perelman
osasuna|ESP|Jagoba Arrasate
osijek|ARG|Federico Bessone
otelul-galati|POR|Rui Duarte
oud-heverlee-leuven|BEL|Timmy Simons
ourense|ESP|Adrián Padrón
oviedo|ESP|Julián Calero
padova|ITA|Antonio Calabro
palermo|ITA|Filippo Inzaghi
palestino|ARG|Guillermo Farré
palmeiras|POR|Abel Ferreira
panathinaikos|DEN|Jacob Neestrup
pantoja|ARG|Alejandro Trionfini
paok|ITA|Alessio Lisci
pardubice|CZE|Jan Trousil
paris-fc|ENG|Liam Rosenior
paris-saint-germain|ESP|Luis Enrique
parma|ITA|Alberto Gilardino
pau|FRA|Thierry Debès
paykan|IRN|Saket Elhami
penarol|URU|Diego Aguirre
persebaya-surabaya|POR|Bernardo Tavares
persepolis|IRN|Mehdi Tartar
persib-bandung|CRO|Igor Tolić
persija-jakarta|KOR|Shin Tae-yong
persijap-jepara|ESP|Juan Cortés
persik-kediri|ESP|Marcos Reina
persita-tangerang|ESP|Carlos Peña
perth-glory|AUS|Adam Griffiths
pescara|ITA|Giorgio Gorgone
petrolul-ploiesti|POR|Ricardo Sousa
philadelphia-union|USA|Ryan Richter
piast-gliwice|POL|Daniel Myśliwiec
piratas-veracruz|MEX|Mario García
pisa|ITA|Paolo Bianco
plateau-united||Gbenga Ogunbote
platense|ARG|Martín Palermo
platense-municipal|COL|Martin Garcia
plaza-colonia|URU|Luis Alberto Mena
pogon-szczecin|ESP|Óscar García
pohang-steelers|KOR|Kim Seong-jae
polissya-zhytomyr|UKR|Ruslan Rotan
ponferradina|TUN|Mehdi Nafti
ponte-preta|BRA|Gilson Kleina
pontevedra|ESP|Rubén Domínguez
portland-timbers|ESP|Martí Cifuentes
porto|ITA|Francesco Farioli
portsmouth|ENG|John Mousinho
portuguesa|VEN|Leonardo González
preston|SCO|Graham Alexander
progreso|URU|Tabaré Silva
psim-yogyakarta|SRB|Risto Vidaković
psm-makassar|BIH|Darije Kalezić
pss-sleman|NED|Pieter Huistra
psv|NED|Peter Bosz
puebla|MEX|Gerardo Espinoza
puerto-cabello-b|VEN|Eduardo Saragó
qingdao-hainiu|SRB|Milan Ristić
qingdao-west-coast|CHN|Zheng Zhi
qpr|FRA|Julien Stéphan
raal-la-louviere|ENG|Edward Still
racing-club|ARG|Sebastián Romero
racing-ferrol|ESP|Javi Vázquez
racing-montevideo|URU|Cristian Chambian
racing-santander|ESP|José Alberto López
radnicki-1923|BIH|Feđa Dudić
radnicki-nis|SRB|Nikola Drinčić
radnik-surdulica|SRB|Zoran Rendulić
radomiak-radom|ENG|John Carver
raja-casablanca|ESP|Paco Jémez
rakow-czestochowa|POL|Dawid Szwarga
ranchers-bees||Usman Abd'Allah
rancho-santana|CRC|Kenneth Barrantes
randers-fc|DEN|Rasmus Bertelsen
rangers|SCO|Derek McInnes
rangers-international||Fidelis Ilechukwu
rapid-bucuresti|ROU|Daniel Pancu
rapid-vienna|DEN|Johannes Hoff Thorup
rayo-majadahonda|ESP|Guille Fernández
rayo-vallecano|ESP|Beñat San José
rayo-zuliano|VEN|Johanny García
rb-bragantino|BRA|Vagner Mancini
rb-salzburg|GER|Danny Röhl
rc-strasbourg|POR|Hugo Oliveira
real-aviles|ESP|Yago Iglesias
real-betis|CHI|Manuel Pellegrini
real-esteli|ARG|Diego Vásquez
real-jaen|ESP|Manolo Herrero
real-madrid|POR|José Mourinho
real-murcia|ESP|Sergi Guilló
real-oruro|ARG|Nicolás Straccia
real-potosi|COL|Giancarlo Umaña
real-salt-lake|USA|Pablo Mastroeni
real-sociedad|USA|Pellegrino Matarazzo
real-tomayapo|ARG|Jorge Alfonso
real-union|ESP|Ramsés Gil
real-zaragoza|ESP|Ibai Gómez
red-star-fc-93|FRA|Damien Perrinelle
reggiana|ITA|Pierpaolo Bisoli
reims|FRA|Nicolas Usaï
remo|BRA|Thiago Carpini
rheindorf-altach|SRB|Ognjen Zaric
ried|CRO|Mario Despotović
rijeka|SVN|Matjaž Kek
rio-ave|POR|Vasco Seabra
river-plate|ARG|Leonardo Ponzio
river-plate-montevideo|URU|Raúl Salazar
rivers-united||Finidi George
rodez|FRA|Didier Santini
rodina-moscow|ESP|Jonatan Alba
rosario-central|ARG|Jorge Almirón
rosenborg|ISL|Freyr Alexandersson
rostov|RUS|Dmitri Kirichenko
royal-antwerp|GER|Marvin Compper
royal-charleroi-sc|BEL|Mario Kohnen
rs-berkane|CPV|Bubista
rubin-kazan|RUS|Oleg Kuzmin
rubio-nu|ARG|Javier Torrente
rudes|CRO|Alen Peternac
sabadell|ESP|Ferran Costa
saint-etienne|SCO|Ian Cathro
salcedo-dominicana|DOM|Arturo Berroa
sampdoria|ITA|Luca D'Angelo
samsunspor|CRO|Nenad Bjelica
san-antonio-bulo-bulo|BOL|Edivaldo Rojas
san-diego-fc|USA|Mikey Varas
san-jose-bolivia|BRA|Artur Costa
san-jose-earthquakes|USA|Bruce Arena
san-lorenzo|ARG|Rubén Darío Insúa
san-lorenzo-paraguay|ARG|Pablo Fornasari
san-marcos-nicaragua|NCA|Tyrone Acevedo
san-martin-sj|ARG|Leandro Romagnoli
sanat-naft|IRN|Mohammad Nouri
sandefjord|SWE|Andreas Tegström
sanfrecce-hiroshima|GER|Bartosch Gaul
sant-andreu|ESP|Javi Rey
santa-clara|POR|Petit
santa-fe|URU|Pablo Repetto
santos|BRA|Cuca
santos-laguna|POR|Renato Paiva
sao-bernardo|BRA|Vinícius Bergantin
sao-paulo|BRA|Dorival Júnior
sarmiento-junin|ARG|Facundo Sava
sassuolo|ITA|Alberto Aquilani
sc-telstar|NED|Henk Brugge
seattle-sounders|USA|Brian Schmetzer
sebaco|NCA|Sergio Ivan rodriguez
sepahan|IRN|Moharram Navidkia
sepsi|ROU|Ovidiu Burcă
servette-fc|FRA|Jocelyn Gourvennec
sevilla|ESP|Luis García
shakhtar-donetsk|TUR|Arda Turan
shams-azar|IRN|Vahid Rezaei
shandong-taishan|CHN|Tang Tian
shanghai-port|AUS|Kevin Muscat
shanghai-shenhua|SRB|Vladan Milojević
sheffield-utd|ENG|Chris Wilder
shenzhen-xinpengcheng|SCO|Robbie Neilson
shimizu-s-pulse|JPN|Takayuki Yoshida
shkendija|MKD|Artim Pollozhani
shkendija-haracine|MKD|Berat Imeri
shooting-stars||Salisu Yusuf
sigma-olomouc|CZE|Pavel Hapal
sileks|MKD|Aleksandar Vasoski
silkeborg-if|DEN|Morten Dahm Kjærgaard
sint-truidense-vv|BEL|Frédéric De Meyer
sk-artis-brno|CZE|Roman Nádvorník
sk-beveren|NED|Tim Bakens
sk-slavia-praha|CZE|Jindřich Trpišovský
skopje|MKD|Muarem Muarem
slaven-belupo|CRO|Silvijo Čabraja
slovacko|CZE|Jan Jelínek
slovan-liberec|SVK|Branislav Fodrek
sochaux|FRA|Vincent Hognon
sonderjyske|DEN|Fatah Abdirahman
southampton|GER|Tonda Eckert
sparta-rotterdam|NED|Rogier Meijer
spartak-moscow|ESP|Juan Carlos Carcedo
spezia|ITA|Luca D'Angelo
sport-boys|ARG|Carlos Desio
sport-huancayo|URU|Richard Pellejero
sport-recife|ARG|Mariano Soso
sporting-braga|POR|Franclim Carvalho
sporting-cristal|PER|Roberto Mosquera
sporting-gijon|ARG|Nicolás Larcamón
sporting-kansas-city|SUI|Raphaël Wicky
sporting-lagos||Jeffrey Buter
sporting-lisboa|POR|Rui Borges
sportivo-ameliano|ARG|Roberto Nanni
sportivo-luqueno|PAR|Lucas Barrios
sportivo-trinidense|PAR|José Arrúa
st-johnstone|FIN|Simo Valakari
st-louis-city-sc|FRA|Yoann Damet
st-mirren|SCO|Craig McLeish
stade-brestois|FRA|Julien Lachuer
stade-rennais|FRA|Franck Haise
standard-liege|BEL|Vincent Euvrard
stoke-city|ENG|Mark Robins
struga-trim-lum|ALB|Bledi Shkëmbi
sturm-graz|AUT|Fabio Ingolitsch
sudtirol|ITA|Davide Possanzini
sunderland|FRA|Régis Le Bris
sv-zulte-waregem|ENG|Michael Beale
swansea|POR|Vítor Matos
sydney-fc|AUS|Patrick Kisnorbo
talaea-el-gaish|EGY|Gamah Mashhoor
talleres|ARG|Omar De Felippe
tapatio|MEX|José Luis Meléndez
tecnico-universitario|URU|Francisco Usúcar
tenerife|ESP|Álvaro Cervera
tepatitlan-fc|MEX|Gustavo Olvera
teplice|SVK|Zdenko Frťala
teruel|ESP|Dani González
the-strongest|BRA|Antônio Carlos Zago
tianjin-jinmen-tiger|CHN|Yu Genwei
tigre|ARG|Juan Carlos Blengio
tigres-uanl|MEX|Víctor Manuel Vucetich
tikves|SVN|Oliver Bogatinov
tirol|AUT|Philipp Semlic
tlaxcala-fc|MEX|Arturo Ortega
tokyo-verdy|JPN|Naoki Soma
toluca|ARG|Antonio Mohamed
tonglianglong|CHN|Liu Jianye
torino|ITA|Ignazio Abate
toronto-fc|USA|Robin Fraser
tottenham|ITA|Roberto De Zerbi
toulouse|DEN|Jens Berthel Askou
trabzonspor|GER|Thomas Reis
tractor|IRN|Javad Nekounam
tromso|NOR|Jørgen Vik
trujillanos|ARG|Mariano Echeverría
twente|NED|John van den Brom
u-catolica|ARG|Daniel Garnero
ucv|VEN|Luis De Oliveira
ud-ibiza|ESP|Raúl Llona
ud-logrones|ESP|Unai Mendia
udinese|GER|Kosta Runjaić
ulsan-hd|KOR|Kim Hyun-seok
unam-pumas|ARG|Esteban Solari
unan-managua|BRA|Flavio da Silva
union|ARG|Leonardo Madelón
union-espanola|CHI|Gonzalo Villagra
union-la-calera|CHI|John Armijo
union-magdalena|COL|Carlos Silva
union-saint-gilloise|BEL|David Hubert
union-touarga-sport-rabat|ITA|Guglielmo Arena
unionistas|ESP|Javi Medina
universidad-catolica|ECU|Diego Martínez
universidad-de-chile|ARG|Fernando Gago
universidad-de-concepcion|CHI|Cristián Muñoz
universidad-om|ESP|Jose Aparacio
universitario|ARG|Fabián Bustos
universitario-de-vinto|BOL|Adrián Barral
universitatea-cluj|ITA|Cristiano Bergodi
universitatea-craiova|POR|Filipe Coelho
urawa-reds|KOR|Cho Kwi-jae
uta-arad|ROU|Adrian Mihalcea
utc-peru|ARG|Cristian Molins
utrecht|NED|Anthony Correia
v-varen-nagasaki|JPN|Takuya Takagi
valencia|MEX|Javier Aguirre
valerenga|NOR|Johannes Moesgaard
valladolid|ESP|Fran Escribá
vancouver-whitecaps|DEN|Jesper Sørensen
varazdin|CRO|Nikola Šafarić
vardar|MNE|Miodrag Božović
vasco-da-gama|POR|Pedro Emanuel
vasteras-sk|SWE|Alexander Rubin
velez-sarsfield|ARG|Guillermo Barros Schelotto
venados-fc|ESP|Nacho Castro
venezia|ITA|Davide Nicola
veres-rivne|UKR|Oleh Shandruk
verona|ITA|Marco Baroni
viborg-ff|DEN|Nickolai Lund
viking|NOR|Bjarte Lunde Aarsheim
viktoria-plzen|CZE|Radoslav Kováč
vila-nova|BRA|Guto Ferreira
villarreal|ESP|Iñigo Pérez
vinotinto-ecuador|ARG|Gabriel Schürrer
virtus-entella|ITA|Andrea Chiappella
vissel-kobe|GER|Michael Skibbe
vitoria|BRA|Jair Ventura
vitoria-guimaraes|POR|Tiago Margarido
volos-nfc|ESP|Juan Carlos Garrido
voluntari|ROU|Florin Pîrvu
walter-ferretti|HON|José Valladares
warri-wolves||Hassan Abdallahi
watford|ITA|Alessio Dionisi
wellington-olympic|NZL|Ekow Quainoo
wellington-phoenix|ENG|Chris Greenacre
west-brom|SCO|James Morrison
western-springs|ENG|Scott Hales
western-suburbs|NZL|Matthew Calvert
western-sydney-wanderers|AUS|Ufuk Talay
widzew-lodz|POL|Mateusz Stolarski
wieczysta-krakow|CRO|Željko Kopić
willem-ii|NED|Jurgen Streppel
wisla-krakow|POL|Mariusz Jop
wisla-plock|POL|Adam Majewski
wolfsberg|AUT|Thomas Silberberger
wolves|POR|César Peixoto
wrexham|ENG|Phil Parkinson
wuhan-three-towns|CHN|Deng Zhuoxiang
wydad-ac|TUN|Nasreddine Nabi
xelaju|GUA|Amarini Villatoro
yaracuyanos|VEN|Arnaldo Aranda
yokohama-f-marinos|AUS|Steve Corica
yunnan-yukun|ESP|Jordi Vinyals
zaglebie-lubin|POL|Leszek Ojrzyński
zamalek|EGY|Motamed Gamal
zamora-espana|ESP|Óscar Cano
zamora-venezuela|VEN|Josué Ortiz
zeleznicar-pancevo|SRB|Radomir Koković
zenit|RUS|Sergei Semak
zhejiang-professional|AUS|Ross Aloisi
zlin|CZE|Pavel Hoftych
zob-ahan|IRN|Abdollah Veysi
zorya-luhansk|UKR|Viktor Skrypnyk
zwolle|NED|Dennis van der Ree`;
    const REAL_NATION_MANAGERS = `
AIA|ENG|Ewan Gunter
ALB|ITA|Rolando Maran
ALG|ALG|Brahim Hemdani
AND|AND|Koldo Álvarez
ANG|SEN|Aliou Cissé
ARG|ARG|Lionel Scaloni
ARM|ARM|Yegishe Melikyan
ARU|ARU|Marvic Bermúdez
ASA|ESP|Diego Gómez
ATG|MEX|Jacques Passy
AUS|AUS|Tony Popovic
AUT|GER|Ralf Rangnick
AZE|AZE|Aykhan Abbasov
BAH|ENG|Gifton Noel-Williams
BAN|USA|Thomas Dooley
BDI|BEL|Patrick Sangwa
BEL|NED|Mark van Bommel
BEN|GER|Gernot Rohr
BER|BER|John Barry Nusum
BFA|COM|Amir Abdou
BHR|ESP|Félix Sánchez
BHU|AUS|Gary Phillips
BIH|BIH|Sergej Barbarez
BLR|BLR|Viktor Goncharenko
BLZ|PER|Martín Dall'Orso
BOL|BOL|Óscar Villegas
BOT|BOT|Thaloba Nthaga
BRA|ITA|Carlo Ancelotti
BRB|BRB|Kent Hall
BRU|BRU|Ali Mustafa
BUL|BUL|Atanas Ribarski
CAM|JPN|Koji Gyotoku
CAN|USA|Jesse Marsch
CAY|CAY|Colin Rowe
CGO|FRA|Claude Le Roy
CHA|SUI|Raoul Savoy
CHI|CHI|Nicolás Córdova
CHN|CHN|Shao Jiayi
CIV|FRA|Hervé Renard
CMR|CMR|David Pagou
COD|FRA|Sébastien Desabre
COK|NZL|Rhys Ruka
COL|ARG|Néstor Lorenzo
COM|FRA|Hubert Velud
CPV|CPV|Humberto Bettencourt
CRC|CRC|Bryan Ruiz
CRO|CRO|Slaven Bilić
CTA|CTA|Eloge Enza Yamissi
CUB|CUB|Pedro Pereira
CUW|NED|Dick Advocaat
CYP|GRE|Akis Mantzios
CZE|ESP|Santi Denia
DEN|DEN|Brian Riemer
DJI|DJI|Mohamed Meraneh Hassan
DMA|SCO|Kurt Herd
DOM|ARG|Marcelo Neveleff
ECU|ARG|Marcelo Gallardo
EGY|EGY|Hossam Hassan
ENG|GER|Thomas Tuchel
EQG|ITA|Vincenzo Alberto Annese
ERI|EGY|Hesham Yakan
ESP|ESP|Luis de la Fuente
EST|EST|Jürgen Henn
ETH|ETH|Yohannes Sahle
FIN|DEN|Jacob Friis
FRA|FRA|Zinedine Zidane
FRO|FRO|Eyðun Klakstein
GAB|FRA|Sébastien Migné
GAM|NIR|Johnny McKinstry
GEO|GEO|Ramaz Svanadze
GER|GER|Jürgen Klopp
GHA|SWE|Kim Björkegren
GIB|GIB|Scott Wiseman
GNB|GNB|Emiliano Té
GRE|SRB|Ivan Jovanović
GRN|TRI|Stern John
GUA|MEX|Luis Fernando Tena
GUI|POR|Paulo Duarte
GUM|GUM|Ross Awa
GUY|CAN|Marco Bonofiglio
HAI|ESP|David Badía
HKG|ESP|Roberto Losada
HON|ESP|José Francisco Molina
HUN|ITA|Marco Rossi
IDN|ENG|John Herdman
IND|IND|Khalid Jamil
IRL|ISL|Heimir Hallgrímsson
IRN|IRN|Amir Ghalenoei
IRQ|AUS|Graham Arnold
ISL|ISL|Arnar Gunnlaugsson
ISR|ISR|Ran Ben Shimon
ITA|ITA|Roberto Mancini
JAM|JAM|Rudolph Speid
JOR|MAR|Ezzaki Badou
JPN|JPN|Hajime Moriyasu
KAZ|NED|John van 't Schip
KEN|RSA|Benni McCarthy
KGZ|KGZ|Urmat Abdukaimov
KOR|ESP|Robert Moreno
KOS|GER|Franco Foda
KSA|GRE|Georgios Donis
KUW|POR|Hélio Sousa
LAO|SRB|Vladica Grujic
LBN|ALG|Madjid Bougherra
LBR|BEL|Mohammed Adil Erradi
LBY|SEN|Youssoupha Dabo
LCA|TRI|Rajesh Latchoo
LES|LES|Bob Mafoso
LIE|GER|Konrad Fünfstück
LTU|LTU|Mindaugas Čepas
LUX|LUX|Jeff Strasser
LVA|ITA|Paolo Nicolato
MAC|MAC|Emmanuel Noruega
MAD|FRA|Corentin Martins
MAR|MAR|Mohamed Ouahbi
MAS|MAS|Tan Cheng Hoe
MDA|MDA|Lilian Popescu
MDV|HUN|István Urbányi
MEX|MEX|Rafael Márquez
MKD|MKD|Goce Sedloski
MLI|POR|Anthony da Silva
MLT|ITA|Emilio De Leo
MNE|MNE|Mirko Vučinić
MNG|SMR|Marco Ragini
MOZ|MOZ|Chiquinho Conde
MRI|POR|Rui Pedro
MSR|ESP|Gabriel Calderón
MTN|ESP|Aritz López Garai
MWI|ZIM|Kalisto Pasuwa
MYA|NOR|Joern Andersen
NAM|NAM|Collin Benjamin
NCA|ARG|Juan Cruz Real
NCL|TAH|Félix Tagawa
NED|ESP|Xavi Hernández
NGA|MLI|Éric Chelle
NIG|ALG|Nabil Neghiz
NIR|NIR|Michael O'Neill
NOR|NOR|Ståle Solbakken
NZL|ENG|Darren Bazeley
OMA|MAR|Tarik Sektioui
PAK|PER|Nolberto Solano
PAN|ESP|Thomas Christiansen
PAR|ARG|Gustavo Alfaro
PER|BRA|Mano Menezes
PHI|ESP|Carles Cuadrat
PLE|PLE|Ihab Abu Jazar
POL|POL|Jan Urban
POR|POR|Jorge Jesus
PRK|PRK|Sin Yong-nam
PUR|USA|Jay Mims
QAT|ESP|Julen Lopetegui
ROU|ROU|Gheorghe Hagi
RSA|RSA|Pitso Mosimane
RUS|RUS|Valery Karpin
RWA|ENG|Stephen Constantine
SAM|NZL|Jess Ibrom
SCO|BEL|Sébastien Pocognoli
SDN|GHA|James Kwesi Appiah
SEN|FRA|Patrick Vieira
SEY|SEY|Vivian Bothe
SIN|SIN|Gavin Lee
SKN|BRA|Marcelo Serrano
SLE|FRA|Didier Gomes Da Rosa
SLV|COL|Hernán Darío Gómez
SMR|ITA|Roberto Cevoli
SOL|ENG|Ben Cahn
SOM|SOM|Yusuf Ali Nur
SRB|SRB|Veljko Paunović
SRI|KUW|Abdullah Al Mutairi
SSD|COD|Christian Nsengi-Biembe
STP|POR|Ricardo Monsanto
SUI|SUI|Murat Yakin
SUR|NED|Henk Fraser
SVK|SVK|Vladimír Weiss
SVN|SVN|Boštjan Cesar
SWE|ENG|Graham Potter
SWZ|SWZ|Dominic Kunene
SYR|ESP|José Lana
TAH|FRA|Joël Fréchet
TAN|ARG|Miguel Ángel Gamondi
THA|ENG|Anthony Hudson
TJK|MKD|Igor Angelovski
TKM|TKM|Rovshen Meredov
TLS|POR|Zé Pedro
TOG|FRA|Patrice Neveu
TPE|AUS|Matt Ross
TRI|TRI|Derek King
TUN|TUN|Mouin Chaâbani
TUR|TUR|Sergen Yalçın
UAE|CRO|Zlatko Dalić
UGA|BEL|Paul Put
UKR|ITA|Andrea Maldera
URU|URU|Diego Forlán
USA|ARG|Mauricio Pochettino
UZB|ITA|Fabio Cannavaro
VAN|VAN|Richard Iwai
VEN|VEN|Oswaldo Vizcarrondo
VGB|ESP|David Pérez
VIE|KOR|Kim Sang-sik
VIN|CAN|Michael Findlay
VIR|VIR|Terrence Jones
WAL|WAL|Craig Bellamy
YEM|ALG|Noureddine Ould Ali
ZAM|ZAM|George Lwandamina
ZIM|ESP|Ramón Catalá`;
    const FREE_MANAGERS = `
MAR|Abdelaziz Dnibi|cod-meknes
MAR|Abdelhadi Sektioui|hassania-agadir
MAR|Abdelouahed Zamrat|as-far
BRA|Abel Braga|internacional
ESP|Abel Gómez|antequera
IDN|Ade Suhendra|isenmulang-kalteng
AUT|Adi Hütter|monaco
MAR|Adil Hermach|wydad-ac
VEN|Adolfo Monsalve|zamora-venezuela
VEN|Adrián Sánchez|academia-anzoategui
NED|Adrie Koster|willem-ii
PER|Agustin Castillo|platense-municipal
ARG|Agustín Robles|orense-sc
IDN|Ahmad Amiruddin|psm-makassar
EGY|Ahmed Abdel Raouf|zamalek
MAR|Ahmed Kantari|nantes
ESP|Aitor Martínez|juventud-torremolinos
JPN|Akio Kogiku|cerezo-osaka
IRL|Alan Sheehan|swansea
ITA|Alberico Evani|sampdoria
ESP|Albert Celades|cadiz
ESP|Albert Espigares|puebla
ESP|Alberto Aguilar|antequera
ESP|Alberto González|albacete
BOL|Alberto Illanes|real-oruro
PAR|Aldo Bobadilla|sportivo-ameliano
URU|Alejandro Apud|cerro
MEX|Alejandro Corona|leon
COL|Alejandro Cortez|tecnico-universitario
CHI|Alejandro Gaete|nublense
URU|Alejandro Larrea|progreso
ESP|Alejandro Menéndez|racing-ferrol
URU|Alejandro Orfila|cusco
GRE|Alekos Vosniadis|kalamata
SRB|Aleksandar Luković|radnicki-1923
SRB|Aleksandar Vuković|widzew-lodz
RUS|Aleksandr Storozhuk|akhmat
AUS|Alen Stajcic|western-sydney-wanderers
COL|Álex Escobar|america-de-cali
ESP|Álex Ortiz|lugo
ESP|Alex Pallarés|macara
NOR|Alexander Tettey|rosenborg
GER|Alexander Zorniger|odense-boldklub
POR|Alexandre Santos|nacional-por
COL|Alexis García|union-magdalena
VEN|Alexis Jordán|academia-anzoategui
ARG|Alexis Sanchez|rancho-santana
ARG|Alexis Santana|rancho-santana
URU|Alfredo Arias|junior
VEN|Alí Cañas|zamora-venezuela
BRA|Allan Aal|londrina
ESP|Álvaro del Moral|levante
COL|Álvaro Hernández|jaguares
URU|Álvaro Navarro|defensor-sporting
POR|Álvaro Pacheco|casa-pia
BOL|Álvaro Peña|blooming
ESP|Álvaro Rubio|valladolid
SWE|Anders Torstensson|mjallby-aif
BRA|Anderson Batatais|ceara
BRA|Anderson Gomes|atletico-goianiense
BRA|André Jardine|club-america
ITA|Andrea Mandorlini|cfr-cluj
ITA|Andrea Sottil|modena
SWE|Andreas Alm|ifk-goteborg
NOR|Andreas Hagen|fredrikstad
COL|Andrey Moreno|bucaramanga
NED|Andries Ulderink|royal-antwerp
SWE|Anes Mravac|malmo-ff
ARG|Ángel “Nino” Piazz|cacahuatique
ARG|Angel Alfredo Vera|madura-united
ARG|Ángel Comizzo|atletico-grau
ITA|Angelo Gregucci|sampdoria
IDN|Ansyari Lubis|pss-sleman
SVN|Ante Šimundža|slask-wroclaw
FRA|Antoine Kombouaré|paris-fc
ESP|Antonio Calderón|juventud-torremolinos
IDN|Antônio Cláudio|persijap-jepara
ITA|Antonio Conte|napoli
POR|António Folha|cfr-cluj
MEX|Antonio López|atletico-la-paz
POR|António Oliveira|sport-recife
ESP|Antxon Muneta|mirandes
ARG|Ariel Broggi|gimnasia-m
ARG|Ariel Holan|rosario-central
BRA|Ariel Mamede|vila-nova
NED|Arne Slot|liverpool
AUS|Arthur Diles|melbourne-victory
MEX|Arturo Alvarado|alebrijes-oaxaca
COL|Arturo Reyes|deportivo-pereira
PAR|Arturo Villasanti|atletico-tembetary
ESP|Arzu|real-betis
ENG|Ashley Cole|cesena
ESP|Asier Garitano|sporting-gijon
TUR|Atila Gerin|eyupspor
ITA|Attilio Lombardo|sampdoria
PAR|Aureliano Torres|olimpia
KSA|Bandar Al-Kubaishan|al-riyadh
SCO|Barry Ferguson|rangers
ARM|Barsegh Kirakosyan|rodina-moscow
FRA|Benoît Tavenot|metz
ITA|Bernardo Corradi|sampdoria
BRA|Bernardo Franco|cuiaba
COL|Bernardo Redín|tecnico-universitario
VEN|Bladimir Morales|puerto-cabello-b
CRO|Bojan Hodak|persib-bandung
SRB|Bojan Krulj|fk-imt
BIH|Bojan Puzigaća|radnicki-1923
ESP|Bolo|huesca
MNE|Božidar Bandović|radnicki-1923
RSA|Bradley Carnell|philadelphia-union
IRL|Brian Shelley|western-suburbs
CZE|Bronislav Červenka|zlin
POR|Bruno Abreu|nacional-por
POR|Bruno Baltazar|radomiak-radom
FRA|Bruno Génésio|lille
BRA|Bruno Lazaroni|vasco-da-gama
TUR|Çağdaş Atan|basaksehir
USA|Caleb Porter|new-england-revolution
ENG|Calum McFarlane|chelsea
COL|Camilo Ayala|alianza
URU|Camilo Speranza|liverpool-montevideo
ESP|Cándido Gómez|ourense
AUS|Carl Veart|adelaide-united
ESP|Carles Martínez Novell|toulouse
VEN|Carlojavier Fuhrman|monagas-sc
ESP|Carlos Alós|juventud-torremolinos
ARG|Carlos Bernegger|fc-zurich
ARG|Carlos Bustos|deportivo-garcilaso
URU|Carlos Canobbio|progreso
POR|Carlos Carvalhal|famalicao
ESP|Carlos Corberán|valencia
ESP|Carlos Cuesta|parma
BRA|Carlos Eduardo Parreira|madura-united
CHI|Carlos Galdames|union-la-calera
PAR|Carlos Jara Saguier|cerro-porteno
BRA|Carlos Leiria|botafogo
ESP|Carlos Martínez|leganes
PER|Carlos Silvestri|cajamarca
ARG|Carlos Tevez|talleres
ESP|Carlos Vicens|sporting-braga
BRA|Cauan de Almeida|avai
BRA|Celso Rodrigues|chapecoense
ESP|César Arzo|juventud-torremolinos
PER|César Chávez-Riva|deportivo-binacional
VEN|César Farías|barcelona-sc
BRA|César Lucena|sport-recife
BRA|César Sampaio|santos
ARG|César Vaioli|los-chankas
ARG|César Vigevani|nacional-potosi
KOR|Chang Woe-ryong|tonglianglong
BRA|Charles Rodrigues|abb
CHN|Chen Tao|shenzhen-xinpengcheng
KOR|Choi Kang-hee|shandong-taishan
USA|Chris Armas|colorado-rapids
WAL|Chris Coleman|oud-heverlee-leuven
SWE|Christer Mattiasson|ik-sirius
ARG|Christian Díaz|atletico-tembetary
ITA|Christian Lattanzio|shenzhen-xinpengcheng
NOR|Christian Michelsen|sarpsborg-08
FRA|Christophe Pélissier|auxerre
MEX|Cirilo Saucedo|club-tijuana
FRA|Claude Puel|nice
ESP|Claudio Barragán|eldense
BRA|Cláudio Caçapa|botafogo
ITA|Claudio Ranieri|as-roma
ARG|Claudio Úbeda|boca-juniors
PAR|Claudio Vargas|club-guarani
BRA|Cleber Xavier|santos
BRA|Cleibson Ferreira|real-potosi
ROU|Constantin Gâlcă|rapid-bucuresti
ROU|Cosmin Contra|al-kholood
ROU|Cristian Chivu|parma
ARG|Cristian Fabbiani|newells-old-boys
MEX|Cristian Flores|fas
COL|Cristian Galíndez|deportivo-pereira
ARG|Cristian Nasuti|emelec
ARG|Cristian Taberna|rancho-santana
ITA|Cristiano Bacci|estrela-amadora
ESP|Cristóbal Parralo|gimnastic
ESP|Cuco Ziganda|cultural-leonesa
ESP|Curro Torres|real-murcia
POR|Custódio|alverca
POR|Custódio Castro|alverca
JPN|Daisuke Kimori|mito-hollyhock
ARG|Dalcio Giovagnoli|san-jose-bolivia
ROU|Dan Petrescu|cfr-cluj
IDN|Danang Suryadi|persijap-jepara
ESP|Dani Fragoso|real-betis
ESP|Dani Llácer|ourense
ESP|Dani Poyatos|gamba-osaka
ESP|Dani Vidal|real-aviles
MEX|Daniel Alcántar|jaiba-brava
URU|Daniel Bartolotta|tepatitlan-fc
AUT|Daniel Beichler|rb-salzburg
PAR|Daniel Farrar|aurora-bolivia
ARG|Daniel Ferreyra|comerciantes-unidos
COL|Daniel Gómez|internacional-bogota
ARG|Daniel Jiménez|instituto-cordoba
ARG|Daniel Messina|aguila
PER|Daniel Morales|comerciantes-unidos
ARG|Daniel Néculman|deportivo-cuenca
ARG|Daniel Oldrá|instituto-cordoba
ARG|Daniel Sagman|real-tomayapo
VEN|Daniel Sasso|ucv
URU|Danielo Núñez|cerro-largo
BIH|Danijel Milićević|kaa-gent
NCA|Danny Rosales|jalapa
URU|Darío Rodríguez|racing-montevideo
ESP|David Caneda|fas
BOL|David Condori|abb
ENG|David Critchley|st-louis-city-sc
SCO|David Gray|hibernian
SLV|David Hernandez|platense-municipal
ECU|David Mero|manta
ESP|David Movilla|sabadell
ESP|David Navarro|real-zaragoza
BOL|David Quiruchi|aurora-bolivia
CZE|David Střihavka|pardubice
AUS|David Zdrilic|perth-glory
ITA|Davide Ballardini|avellino
ITA|Davide Dionigi|reggiana
CHI|Davis González|everton-chile
POL|Dawid Kroczek|rakow-czestochowa
POL|Dawid Szulczek|rakow-czestochowa
COL|Dayron Pérez|yaracuyanos
SRB|Dejan Stanković|spartak-moscow
SUI|Dennis Hediger|fc-zurich
FRA|Didier Digard|le-havre
ARG|Diego Bonelli|deportivo-cuenca
ARG|Diego Cocca|atlas
ARG|Diego Dabove|tigre
URU|Diego Jaume|boston-river
URU|Diego López|river-plate-montevideo
ARG|Diego Monarriz|danubio
ARG|Diego Osella|central-espanol
ARG|Diego Raimondi|america-de-cali
ARG|Diego Ripacolli|adt-peru
ARG|Diego Vázquez|marquense
GER|Dino Toppmöller|lens
BRA|Diogo Giacomini|america-mineiro
COL|Diómedes Peña|san-antonio-bulo-bulo
POR|Divaldo Alves|persik-kediri
ESP|Domènec Torrent|atletico-san-luis
BEL|Domenico Olivieri|krc-genk
GER|Domenico Tedesco|bologna
BOL|Donadony Alá Soto|aurora-bolivia
BRA|Douglas Leite|america-mineiro
CRO|Dragan Skočić|tractor
SRB|Dušan Đorđević|radnik-surdulica
GUA|Dwight Pezzarossi|guastatoya
ENG|Eddie Howe|newcastle
COL|Édgar Ospina|ayacucho-fc
VEN|Edgar Pérez Greco|deportivo-tachira-fc
ECU|Édison Méndez|leones-ecuador
BRA|Édson Boaro|ponte-preta
BRA|Eduardo Barroca|crb-brasil
ARG|Eduardo Berizzo|leon
ARG|Eduardo Coudet|river-plate
URU|Eduardo Espinel|racing-montevideo
ESP|Eduardo Pérez Morán|persebaya-surabaya
BRA|Eduardo Souza|atletico-goianiense
BOL|Eduardo Villegas|the-strongest
ROU|Edward Iordănescu|legia-warszawa
PER|Edwin Arce|juan-pablo-ii
PER|Edwin Arévalo|utc-peru
SLV|Edwin Portillo|isidro-metapan
SLV|Efrain Burgos|isidro-metapan
SLV|Efraín Burgos|isidro-metapan
MEX|Efraín Juárez|unam-pumas
MEX|Efrén Hernández|alebrijes-oaxaca
ECU|Efrén Mera|manta
EGY|Emad El Nahhas|al-ahly
NCA|Emilio Aburto|managua
ESP|Emilio Larraz|real-zaragoza
VEN|Enrique García|monagas-sc
WAL|Eric Ramsay|minnesota-united
FRA|Éric Roy|stade-brestois
SLV|Erick Prado|isidro-metapan
PER|Erick Torres|deportivo-binacional
NOR|Erling Moe|molde
ARG|Ernesto Corti|alianza-fc
ARG|Ernesto Pedernera|godoy-cruz
IDN|Erwan Hendarwanto|psim-yogyakarta
CHI|Erwin Durán|deportes-la-serena
BOL|Erwin Sánchez|blooming
ROU|Eugen Neagoe|petrolul-ploiesti
PAR|Ever Almeida|olimpia
ARG|Ezequiel Tartaglia|aucas
ARG|Fabián Frías|mushuc-runa
ITA|Fabio Caserta|empoli
ITA|Fabio Gallo|virtus-entella
ITA|Fabio Grosso|sassuolo
BRA|Fábio Lefundes|borneo-samarinda
ITA|Fabrizio Castori|sudtirol
ARG|Facundo Biondi|abb
ARG|Facundo Gareca|universidad-de-concepcion
RSA|Fadlu Davids|raja-casablanca
BEL|Faris Haroun|royal-antwerp
TUN|Fathi Al-Jabal|al-faisaly-fc
TUR|Fatih Tekke|trabzonspor
TUR|Fatih Terim|al-shabab
ARG|Favio Orsi|newells-old-boys
URU|Federico Nieves|albion
BEL|Felice Mazzù|oud-heverlee-leuven
BRA|Felipe|vasco-da-gama
URU|Felipe de la Riva|real-tomayapo
PAR|Felipe Giménez|2-de-mayo
AUT|Ferdinand Feldhofer|grazer-ak
VEN|Fernando Aristeguieta|caracas-fc
BRA|Fernando Diniz|vasco-da-gama
ESP|Fernando Estévez|ponferradina
BRA|Fernando Seabra|coritiba
ARG|Fernando Zaniratto|gimnasia-lp
POR|Filipe Martins|wuhan-three-towns
BRA|Flávio Garcia|remo
ROU|Flavius Stoican|farul-constanta
ESP|Franc Artiga|rubin-kazan
ESP|Francisco|santos-laguna
CHI|Francisco Arrué|nublense
CHI|Francisco Bozán|deportes-la-serena
COL|Francisco López|santa-fe
ARG|Francisco Meneghini|ohiggins
URU|Francisco Palladino|river-plate-montevideo
FRA|Franck Rizzetto|grenoble
PER|Franco Navarro|sport-huancayo
NED|Fred Grim|ajax
FRA|Frédéric Gueguen|grenoble
BEL|Frédéric Taquin|raal-la-louviere
DEN|Frederik Birk|brondby-if
RUS|Fyodor Shcherbachenko|akhmat
ESP|Gabi|real-zaragoza
ARG|Gabriel Álvarez|luis-angel-firpo
ARG|Gabriel Nasta|real-tomayapo
ITA|Gabriele Cioffi|carrarese
ESP|Gaizka Garitano|cadiz
NOR|Gard Holme|tromso
AUS|Gary van Egmond|western-sydney-wanderers
NOR|Geir Bakke|valerenga
GRE|Georgios Antonopoulos|asteras-tripolis
ECU|Geovanny Cumbicus|tecnico-universitario
ARG|Gerardo Acuña|estudiantes-de-rio-cuarto
COL|Gerardo Bedoya|union-magdalena
URU|Gerardo Miranda|defensor-sporting
AUT|Gerhard Struber|bristol-city
AUT|Gernot Messner|grasshopper
BRA|Gerson Ramos|juventude
IRN|Ghasem Haddadifar|zob-ahan
AUS|Giancarlo Italiano|wellington-phoenix
VEN|Giancarlo Maldonado|portuguesa
GRE|Giannis Kontoes|asteras-tripolis
POR|Gil Lameiras|vitoria-guimaraes
MEX|Gilberto Adame|atletico-morelia
BRA|Gilmar Dal Pozzo|chapecoense
PER|Gino Reyes|ayacucho-fc
SUI|Giorgio Contini|bsc-young-boys
GRE|Giorgos Antonopoulos|asteras-tripolis
GRE|Giorgos Petrakis|iraklis
ITA|Giovanni Stroppa|venezia
ECU|Giovanny Espinoza|leones-ecuador
POR|Gonçalo Brandão|casa-pia
MEX|Gonzalo Pineda|atlas
CRO|Goran Tomić|istra-1961
BOL|Gualberto Mojica|oriente-petrolero
ARG|Guido Pizarro|tigres-uanl
ESP|Guillermo Abascal|atletico-san-luis
ARG|Guillermo Duró|deportivo-riestra
ESP|Guillermo Fernández Romo|racing-ferrol
ARG|Guillermo Hoyos|inter-miami
PER|Guillermo Vásquez|sport-boys
URU|Gus Poyet|al-khaleej
ARG|Gustavo Dalsasso|everton-chile
URU|Gustavo Díaz|correcaminos-uat
URU|Gustavo Ferreyra|boston-river
URU|Gustavo Ferrín|liverpool-montevideo
BRA|Gustavo Leal|tlaxcala-fc
URU|Gustavo Matosas|danubio
PAR|Gustavo Morínigo|rubio-nu
BOL|Gustavo Quinteros|independiente
IDN|Gustur Cahyo Utomo|psim-yogyakarta
SEN|Habib Beye|olympique-de-marseille
EGY|Haitham Shaaban|talaea-el-gaish
CHN|Han Peng|shandong-taishan
IDN|Hanim Sugiarto|bhayangkara-presisi-lampung
BEL|Hans Cornelis|royal-charleroi-sc
BEL|Hans Somers|oud-heverlee-leuven
KSA|Hassan Khalifa|al-ittihad
ARG|Héctor Bidoglio|deportivo-la-guaira
ARG|Héctor Cúper|universitario
URU|Héctor Hugo Eugui|correcaminos-uat
PAR|Héctor Marecos|rubio-nu
HON|Hector Medina|matagalpa
HON|Héctor Medina|matagalpa
SLV|Hector Omar Mejia|isidro-metapan
SLV|Héctor Omar Mejía|isidro-metapan
BRA|Hélio dos Anjos|nautico-brasil
NED|Henk de Jong|cambuur
VEN|Henry Meléndez|caracas-fc
NED|Henry van der Vegt|zwolle
ARG|Hernán Cristante|puebla
COL|Hernán Darío Herrera|once-caldas
MEX|Hernán Elizondo|tigres-uanl
ARG|Hernán Lamberti|platense
ARG|Hernán Lisi|utc-peru
URU|Hernán Rodrigo López|sportivo-luqueno
COL|Hernán Torres|millonarios
MAR|Hicham Dmiai|kawkab-marrakech
JPN|Hideo Ōshima|yokohama-f-marinos
JPN|Hiroshi Jofuku|tokyo-verdy
URU|Horacio Peralta|miramar-misiones
COL|Hubert Bodhert|alianza
PAR|Humberto García|general-caballero-jlm
BOL|Humberto Viviani|san-jose-bolivia
TUR|Hüseyin Çimşir|trabzonspor
TUR|Hüseyin Eroğlu|genclerbirligi
USA|Ian Russell|san-jose-earthquakes
ROU|Ianis Zicu|farul-constanta
MEX|Ignacio Ambríz|leon
URU|Ignacio Ithurralde|defensor-sporting
URU|Ignacio Ordóñez|cerro-largo
URU|Ignacio Pallas|cerro
CRO|Igor Jovićević|widzew-lodz
ESP|Igor Oca|leganes
RUS|Igor Osinkin|krylya-sovetov
CRO|Igor Tudor|tottenham
UKR|Ihor Kostyuk|dynamo-kyiv
VEN|Ildemaro Fernández|estudiantes-merida
ESP|Imanol Idiakez|cadiz
IDN|Imran Nahumarury|malut-united
ESP|Iñaki Astiz|legia-warszawa
ESP|Ion Ansotegi|real-sociedad
SLV|Isaac Zelaya|aguila
ARG|Ismael Blanco|tecnico-universitario
ESP|Ismael Rescalvo|barcelona-sc
GER|Ismail Atalan|wolfsberg
TUR|İsmail Kartal|fenerbahce
TUR|İsmet Taşdemir|gaziantep
ARG|Israel Damonte|aldosivi
BRA|Ivan Baitello|mirassol
ARG|Iván Delfino|estudiantes-de-rio-cuarto
ESP|Iván Fernández|puerto-cabello-b
ARG|Iván Franco Sopegno|comunicaciones
BRA|Ivan Izzo|botafogo-fc
POL|Jacek Zieliński|korona-kielce
IRL|Jack Cassidy|portland-timbers
ENG|Jack Wilshere|norwich
COL|Jaime de la Pava|sport-boys
MEX|Jaime Lozano|cf-pachuca
PER|Jaime Serna|deportivo-moquegua
COL|Jairo Basabe|jalapa
DEN|Jakob Michelsen|hamarkameratene
BRA|James Freitas|gremio
CZE|Jan Kameník|slovacko
NED|Jan Olde Riekerink|dewa-united
ESP|Javi Gracia|watford
ESP|Javi Rozada|real-aviles
PER|Javier Arce|comerciantes-unidos
ECU|Javier Carvajal|manta
ARG|Javier Mascherano|inter-miami
URU|Javier Méndez|progreso
VEN|Javier Villafráz|rayo-zuliano
NED|Jean-Paul van Gastel|psim-yogyakarta
FRA|Jérémy Taravel|anderlecht
ESP|Jesús Galván|mirandes
MKD|Jeton Beqiri|shkendija
COL|Jhann Carlos López|aguilas-doradas
VEN|Jhon Pinto|yaracuyanos
CHI|Jhon Valladares|universidad-de-chile
VEN|Jhonny Ferreira|monagas-sc
USA|Jim Curtin|philadelphia-union
BEL|Jimmy De Wulf|cercle-brugge
SWE|Jimmy Thelin|aberdeen
CZE|Jiří Krejčí|pardubice
AUT|Joachim Standfest|grazer-ak
POR|João Correia|atletico-paranaense
POR|João Gião|nacional-por
POR|João Nuno|estrela-amadora
BRA|João Paulo Barros|abb
POR|João Sacramento|lask
URU|Joaquín Boghossian|albion
ESP|Joaquín Caparrós|sevilla
ESP|Joaquín Gómez|borneo-samarinda
BOL|Joaquín Monasterio|guabira
SWE|Johan Lindholm|halmstads-bk
USA|John Hackworth|st-louis-city-sc
NED|John Heitinga|ajax
NED|John Stegeman|willem-ii
ESP|Jonathan Risueño|aguilas-doradas
NED|Joop Oosterveld|bk-hacken
PAR|Jorge Achucarro|cerro-porteno
URU|Jorge Bava|cerro-porteno
URU|Jorge da Silva|america-de-cali
COL|Jorge Enrique Patiño|deportivo-pereira
COL|Jorge Luis Pinto|union-magdalena
ARG|Jorge Sampaoli|atletico-mg
PER|Jorge Soto|sporting-cristal
MEX|Jorge Urbina|correcaminos-uat
ARG|Jorge Vivaldo|los-chankas
BOL|Jorge Wuinch|san-jose-bolivia
NOR|Jørn Andersen|yunnan-yukun
ARG|José Acciari|unionistas
ESP|José Alberto Lopez|racing-santander
POR|José Augusto Faria|estrela-amadora
ARG|José Collatti|ayacucho-fc
URU|José Daniel Carreño|al-riyadh
COL|José Eugenio Hernández|comerciantes-unidos
ENG|José Figueira|auckland-united
ARG|Jose Giacone|diriangen
ARG|José Giacone|diriangen
COL|José Luis García|llaneros
ESP|José Luis Mendilibar|olympiacos
ESP|José Luis Oltra|huesca
CHI|José Luis Sierra|union-espanola
MEX|Jose Luis Trejo|coban-imperial
VEN|José María Morr|zamora-venezuela
SLV|Jose Romero|municipal-limeno
CZE|Josef Dvorník|banik-ostrava
CZE|Josef Jinoch|mlada-boleslav
ESP|Josep Ferrando|eldense
ESP|Josep Maria Gené|ce-europa
SRB|Jovan Damjanović|ofk-beograd
PER|Juan Cahuas|adt-peru
ESP|Juan Carballo|ourense
COL|Juan Carlos Álvarez|boyaca-chico
PER|Juan Carlos Cabanillas|sport-boys
MEX|Juan Carlos Chávez|aguila
PER|Juan Carlos Malpica|cajamarca
COL|Juan Carlos Osorio|remo
BOL|Juan Carlos Paz|the-strongest
COL|Juan David Niño|aguilas-doradas
ESP|Juan Díaz Quinta|rodina-moscow
VEN|Juan Domingo Tolisano|deportivo-la-guaira
ESP|Juan Ferrando|volos-nfc
ARG|Juan Grabowski|vinotinto-ecuador
CHI|Juan José Ribera|nublense
URU|Juan Manuel Martínez|montevideo-wanderers
URU|Juan Manuel Olivera|danubio
MEX|Juan Manuel Rivera|alebrijes-oaxaca
ESP|Juan Manuel Rodríguez|las-palmas
ARG|Juan Pablo Pumpido|sportivo-luqueno
ARG|Juan Pablo Vojvoda|santos
PER|Juan Reynoso|fbc-melgar
ESP|Juan Sabas|zamora-espana
PAR|Juan Samudio|libertad-asuncion
ARG|Juan Zubeldía|delfin-ecuador
BOL|Julio César Baldivieso|always-ready
PAR|Julio César Cáceres|san-lorenzo-paraguay
URU|Julio César Ribas|river-plate-montevideo
BOL|Julio Quinteros|abb
AUT|Jürgen Säumel|sturm-graz
NZL|Kale Herbert|miramar-rangers
NZL|Kale Herbet|miramar-rangers
SWE|Kalle Karlsson|vasteras-sk
BEL|Karel Geraerts|reims
NOR|Karl Marius Aksum|mjallby-aif
POL|Kazimierz Moskal|wieczysta-krakow
DEN|Kent Nielsen|silkeborg-if
JPN|Kenta Hasegawa|nagoya-grampus
USA|Kerry Zavagnin|sporting-kansas-city
USA|Kevin Flanagan|dc-united
KSA|Khaled Al-Atwi|diriyah-club
RUS|Khasanbi Bidzhiyev|dynamo-makhachkala
NIR|Kieran McKenna|ipswich
ESP|Kiko Ramírez|teruel
KOR|Kim Do-heon|jeonbuk
KOR|Kim Hak-bum|jeju
KOR|Kim Jung-soo|jeju
KOR|Kim Pan-gon|ulsan-hd
GRE|Kostas Bratsos|volos-nfc
GRE|Kostas Georgiadis|volos-nfc
CRO|Krešimir Režić|istra-1961
TUN|Lassaad Chabbi|raja-casablanca
ROU|László Balint|otelul-galati
FRA|Laurent Blanc|al-ittihad
BRA|Leandro Zago|santos
KOR|Lee Jung-hyo|gwangju
BRA|Léo Condé|remo
ROU|Leo Grozavu|botosani
URU|Leonardo Ramos|universidad-de-concepcion
PER|Leonardo Rojas|adt-peru
COL|Leonardo Torres|alianza
COL|Leonel Álvarez|bucaramanga
GUA|Leonel Noriega|marquense
RUS|Leonid Slutsky|shanghai-shenhua
GRE|Leonidas Vokolos|atromitos
TUR|Levent Şahin|genclerbirligi
CHN|Li Jinyu|liaoning-tieren
CHN|Li Xiaopeng|qingdao-hainiu
SCO|Liam Fox|hearts
ENG|Liam Manning|norwich
ROU|Liviu Ciobotariu|petrolul-ploiesti
ESP|Lolo Escobar|real-aviles
ITA|Lorenzo Rubinacci|reggiana
CZE|Luboš Loučka|ac-sparta-praha
LUX|Luc Holtz|metz
ARG|Lucas Bernardi|newells-old-boys
BRA|Lucas Gonçalves|atletico-mg
ARG|Lucas Pusineri|central-cordoba-de-santiago
ARG|Lucho González|atletico-paranaense
ESP|Luci|sevilla
SUI|Ludovic Magnin|fc-basel
MEX|Luis Arce|cancun-fc
ESP|Luis César Sampedro|gimnastic
PER|Luis Flores|deportivo-binacional
ARG|Luis Islas|ayacucho-fc
COL|Luis Javier Londoño|jalapa
ESP|Luis Miguel Ramis|osasuna
CHI|Luis Pérez|colo-colo
POR|Luís Silva|estrela-amadora
ESP|Luis Tevenet|valladolid
NCA|Luis Vega|unan-managua
ARG|Luis Zubeldía|fluminense
BRA|Luizinho Lopes|operario-ferroviario
POL|Łukasz Tomczyk|rakow-czestochowa
BEL|Maarten Martens|az
POL|Maciej Skorża|urawa-reds
EGY|Magdy Abdelaaty|modern-sport
NOR|Magne Hoseth|molde
RUS|Magomed Adiyev|krylya-sovetov
AUT|Manfred Schmid|hartberg
ESP|Manolo González|espanyol
ESP|Manolo Jiménez|aris-thessaloniki
PER|Manuel Barreto|universitario
CHN|Mao Yijun|shanghai-shenhua
CAN|Marc Dos Santos|los-angeles-fc
ESP|Marcelino|villarreal
BRA|Marcelo Fernandes|ponte-preta
URU|Marcelo Palau|2-de-mayo
ARG|Marcelo Robledo|real-oruro
ARG|Marcelo Straccia|guabira
BRA|Márcio Goiano|sport-recife
BRA|Márcio Zanardi|ponte-preta
MEX|Marco Antonio Ruiz|jaiba-brava
ITA|Marco Donadel|cf-montreal
MEX|Marco Fabián Vázquez|tlaxcala-fc
ESP|Marco García|sevilla
ITA|Marco Giampaolo|cremonese
SLV|Marco Portillo|alianza-fc
PER|Marco Valencia|fbc-melgar
SLV|Marcos Portillo|alianza-fc
SVK|Marek Bakoš|viktoria-plzen
ARG|Mariano Charlier|aldosivi
ARG|Mariano Herrón|boca-juniors
GRE|Marinos Ouzounidis|aris-thessaloniki
CRO|Mario Cvitanović|lokomotiva-zagreb
LIE|Mario Frick|fc-luzern
ARG|Mario Grana|san-lorenzo-paraguay
CRO|Mario Gregurina|slaven-belupo
CRO|Mario Kovačević|dinamo-zagreb
POR|Mário Lemos|persijap-jepara
MEX|Mario Ortiz|atletico-morelia
CHI|Mario Salas|nublense
ARG|Mario Sciacqua|deportes-la-serena
POR|Mário Silva|al-ahli
ESP|Mario Simón|unionistas
ENG|Mark Jackson|central-coast-mariners
SRB|Marko Jovanović|fk-partizan
SRB|Marko Neđić|radnicki-nis
GER|Markus Neumayr|lausanne-sport
BRA|Marquinhos Santos|arema-fc
ARG|Martín Bravo|puebla
ARG|Martín Cardetti|comerciantes-unidos
ARG|Martín Cicotello|union-la-calera
ARG|Martín Demichelis|mallorca
SWE|Martin Falk|molde
ENG|Martin Foyston|sarpsborg-08
CZE|Martin Hyský|viktoria-plzen
URU|Martín Lasarte|club-nacional
URU|Martín Ligüera|club-nacional
JPN|Masaki Chugo|kashima-antlers
JPN|Masami Ihara|kashiwa-reysol
ITA|Massimo Brambilla|juventus
ITA|Massimo Donati|sampdoria
NED|Maurice Steijn|sparta-rotterdam
NCA|Mauricio Cruz|walter-ferretti
BOL|Mauricio Soria|blooming
BRA|Maurício Souza|persija-jakarta
SUI|Mauro Lustrinelli|fc-thun
SWE|Max Mölder|piast-gliwice
AUT|Maximilian Ritscher|lask
AUT|Maximilian Senft|ried
MAR|Mehdi Mrani Alaoui|rca-zemamra
TUR|Mehmet Topal|petrolul-ploiesti
NED|Melvin Boel|go-ahead-eagles
TUR|Metin Diyadin|genclerbirligi
NZL|Michael Built|western-suburbs
GER|Michael Wimmer|motherwell
ESP|Míchel Alonso|racing-ferrol
ARM|Michel Der Zakarian|nantes
PER|Mifflin Bermúdez|alianza-universidad
ALB|Migjen Basha|lausanne-sport
ESP|Miguel Álvarez|ud-ibiza
ESP|Miguel Ángel Ramírez|malmo-ff
ARG|Miguel Ángel Russo|boca-juniors
ARG|Miguel Ángel Zahzú|san-jose-bolivia
MEX|Miguel Fuentes|atlante-fc
ARG|Miguel Pavani|rubio-nu
CHI|Miguel Ramírez|deportes-iquique
ROU|Mihai Teja|dinamo-bucuresti
ENG|Mike Jackson|burnley
GUA|Mike Leonardo|guastatoya
FRO|Mikkjal Thomassen|aik
SRB|Milan Rastavac|ofi
AUS|Mile Sterjovski|macarthur-fc
MAR|Mimoun Mokhtari|union-touarga-sport-rabat
MAR|Mimoun Moukhtari|union-touarga-sport-rabat
ROU|Mircea Rednic|standard-liege
ROU|Mirel Rădoi|gaziantep
CZE|Miroslav Koubek|viktoria-plzen
SRB|Miroslav Tanjga|fk-vojvodina
SRB|Mladen Dodić|fk-mladost-lucani
BIH|Mladen Žižović|radnicki-1923
MAR|Mohamed Amine Benhachem|wydad-ac
MAR|Mohamed Aziz|cod-meknes
MAR|Mohamed Fakhir|rca-zemamra
EGY|Mohamed Maki|al-mokawloon-al-arab
KSA|Mohammad Al-Shalhoub|al-hilal
IRN|Mohammad Rabiei|zob-ahan
IRN|Mohammad Saeid Akhbari|chadormalu-ardakan
KSA|Mohammed Al-Abdali|al-taawoun
MAR|Mohammed Benchrifa|wydad-ac
IRN|Mojtaba Jabbari|esteghlal
RUS|Murat Iskakov|akron
KOR|Nam Ki-il|henan-songshan-longmen
ESP|Natxo González|sant-andreu
URU|Nelson Abeijón|cerro
COL|Nelson Flórez|cucuta-deportivo
PAR|Nelson Haedo Valdez|libertad-asuncion
SRB|Nenad Lalatović|fk-novi-pazar
SRB|Nenad Mijailović|fk-mladost-lucani
SRB|Nenad Stojakovic|fk-partizan
PAR|Néstor Colinas|real-oruro
SRB|Nestor El Maestro|al-riyadh
ARG|Néstor Gorosito|san-lorenzo
ENG|Nick Cushing|new-york-city-fc
BEL|Nicky Hayen|burnley
ESP|Nico Estévez|austin-fc
ARG|Nicolás Chietino|delfin-ecuador
ARG|Nicolás Sánchez|monterrey
SRB|Nikola Pavlović|radnicki-1923
SRB|Nikola Trajković|fk-mladost-lucani
GRE|Nikos Papadopoulos|levadiakos
ARG|Norberto Batista|argentinos-jrs
ARG|Norberto Fernández|belgrano
ALG|Noureddine Zekri|al-shabab
POR|Nuno Espírito Santo|west-ham
ROU|Octavian Chihaia|rapid-bucuresti
ECU|Octavio Zambrano|monagas-sc
NOR|Ole Gunnar Solskjær|besiktas
RUS|Oleg Vasilenko|fakel
UKR|Oleksandr Maksymov|polissya-zhytomyr
UKR|Oleksandr Shovkovskyi|dynamo-kyiv
SWE|Olof Mellberg|st-louis-city-sc
MEX|Omar Flores|atlas
PER|Omar Ríos|cajamarca
COL|Omar Rodríguez|millonarios
MEX|Omar Tapia|santos-laguna
CZE|Ondřej Smetana|banik-ostrava
MAS|Ong Kim Swee|persik-kediri
GER|Onur Cinel|cercle-brugge
ESP|Oriol Riera|istra-1961
BRA|Orlando Ribeiro|corinthians
PER|Orlando Romero|adt-peru
NCA|Oscar Blanco|unan-managua
ESP|Óscar Gilsanz|deportivo-la-coruna
SWE|Oscar Hiljemark|pisa
COL|Óscar Pareja|orlando-city
ESP|Óscar Sánchez|valencia
VEN|Oswaldo Chaurant|trujillanos
NCA|Otoniel Olivas|real-esteli
ESP|Pablo Alfaro|gimnastic
ESP|Pablo Álvarez|alcorcon
URU|Pablo Bossi|utc-peru
URU|Pablo Correa|nancy
URU|Pablo de Ambrosio|central-espanol
ARG|Pablo De Muner|defensa-y-justicia
ESP|Pablo Franco|maghreb-de-fez
URU|Pablo Gaglianone|atletico-torque
URU|Pablo García|atromitos
ARG|Pablo Guiñazú|libertad-asuncion
ESP|Pablo López|racing-ferrol
URU|Pablo Moreira|new-england-revolution
URU|Pablo Quiñones|cacahuatique
ARG|Pablo Rubinich|san-jose-bolivia
ESP|Paco López|leganes
MEX|Paco Ramírez|dorados-de-sinaloa
ITA|Paolo Mandelli|modena
ITA|Paolo Sammarco|verona
ITA|Paolo Zanetti|verona
KOR|Park Tae-ha|pohang-steelers
FRA|Patrice Carteron|wydad-ac
CHI|Patricio Almendra|deportes-concepcion
ECU|Patricio Hurtado|ldu-de-quito
ECU|Patricio Urrutia|delfin-ecuador
NED|Patrick van Leeuwen|kryvbas-kryvyi-rih
POL|Patryk Czubak|widzew-lodz
PER|Paul Cominges|alianza-universidad
ENG|Paul Heckingbottom|preston
BRB|Paul Ifill|wellington-olympic
NIR|Paul Munster|bhayangkara-presisi-lampung
NZL|Paul Posa|auckland-city
NED|Paul Simonis|go-ahead-eagles
URU|Paulo Pezzolano|internacional
POR|Paulo Sérgio|wydad-ac
BRA|Paulo Turra|vila-nova
POR|Pedro Caixinha|fc-juarez
VEN|Pedro Depablos|san-antonio-bulo-bulo
PAR|Pedro Sarabia|nacional-asuncion
VEN|Pedro Vera|trujillanos
ESP|Pep Guardiola|manchester-city
ESP|Pep Muñoz|shenzhen-xinpengcheng
ESP|Pepe Mel|ir-tanger
NOR|Per-Mathias Høgmo|molde
BRA|Péricles Chamusca|al-taawoun
AUS|Peter Cklamovski|fc-tokyo
SCO|Peter Leven|aberdeen
FRA|Peter Luccin|fc-dallas
AUT|Peter Pacult|wolfsberg
AUT|Peter Stöger|austria-wien
USA|Peter Vermes|sporting-kansas-city
NOR|Petter Myhre|valerenga
ENG|Phil Neville|portland-timbers
FRA|Philippe Montanier|saint-etienne
POL|Piotr Gierczak|gornik-zabrze
ESP|Quique Setién|beijing-guoan
MAR|Rachid Taoussi|kawkab-marrakech
MNE|Radomir Đalović|rijeka
ESP|Rafael Benítez|panathinaikos
MEX|Rafael Fernández|tlaxcala-fc
POL|Rafał Grzyb|radomiak-radom
ITA|Raffaele Biancolino|avellino
IDN|Rakhmat Basuki|madura-united
ESP|Ramiro Amarelle|beijing-guoan
ARG|Ramón Díaz|corinthians
NCA|Ramón Otoniel Olivas|real-esteli
TJK|Rashid Rakhimov|rubin-kazan
ARG|Raúl Antuña|orense-sc
ESP|Raúl Caneda|zhejiang-professional
MEX|Raúl Chabrand|atletico-san-luis
ESP|Raúl Guillén|cartagena-espana
BOL|Raúl Gutiérrez|blooming
ESP|Raúl Jardiel|huesca
ROU|Răzvan Lucescu|paok
MAR|Reda Hakam|kawkab-marrakech
MAR|Redouane El Haimeur|rca-zemamra
BRA|Reinan Santos|fortaleza
GER|Reiner Maurer|qingdao-west-coast
BRA|Renan Brito|atletico-goianiense
BOL|René Hinojosa|independiente-petrolero
COL|René Rosero|deportivo-pasto
MEX|Ricardo Carbajal|atlante-fc
BRA|Ricardo Catalá|sao-bernardo
NED|Ricardo Moniz|fc-zurich
POR|Ricardo Sá Pinto|esteghlal
POR|Ricardo Soares|wuhan-three-towns
CHI|Ricardo Viveros|universidad-de-concepcion
VEN|Richard Páez|cucuta-deportivo
MEX|Rigoberto Esparza|venados-fc
WAL|Rob Edwards|wolves
USA|Rob Valentino|atlanta-united
NZL|Robbie Stanton|coastal-spirit
ROU|Róbert Ilyés|csikszereda
SWE|Roberth Björknesjö|djurgardens-if
ITA|Roberto Breda|padova
ITA|Roberto D'Aversa|torino
ITA|Roberto Donadoni|spezia
MEX|Roberto Montoya|coban-imperial
ITA|Roberto Murgita|genoa
PAR|Roberto Torres|boyaca-chico
GER|Robin Peter|den-haag
NED|Robin van Persie|feyenoord
URU|Robinson Hernández|banfield
BRA|Rodrigo Bellão|botafogo
BRA|Rodrigo Chagas|vitoria
BRA|Rodrigo Santana|ponte-preta
CHI|Rodrigo Valenzuela|u-catolica
CHI|Rodrigo Venegas|oriente-petrolero
BRA|Roger|athletic-brasil
BRA|Roger Machado|sao-paulo
BRA|Rogério Micale|londrina
KOR|Roh Sang-rae|ulsan-hd
URU|Roland Marcenaro|metropolitanos-fc
ARG|Rolando Carlen|guabira
SLV|Rolando Torres|fuerte-san-francisco
URU|Román Cuello|defensor-sporting
NED|Ron Jans|utrecht
CHI|Ronald Fuentes|nublense
CRC|Rónald González|comunicaciones
NOR|Ronny Deila|atlanta-united
ENG|Roy Hodgson|bristol-city
ESP|Rubén Albés|leganes
ESP|Rubén de la Barrera|las-palmas
ESP|Rubén Sellés|hull-city
ESP|Rubén Torrecilla|hercules
AUS|Ruben Zadkovich|brisbane-roar
ESP|Rubi|almeria
POR|Rui Vitória|panathinaikos
SCO|Russell Martin|rangers
NZL|Ryan Edwards|christchurch-united
ENG|Ryan Mason|west-brom
KSA|Saad Al-Shehri|al-ettifaq
IRN|Saeed Daghighi|paykan
IRN|Saeid Daghighi|kheybar-khorramabad
MAR|Said Chiba|fath-union-sports-rabat
MAR|Saïd Chiba|fath-union-sports-rabat
ESP|Salvador Valero|fc-juarez
MLI|Samba Diawara|reims
NCA|Samuel Olivas|real-esteli
NOR|Sander Nyland|sarpsborg-08
CRO|Sandro Perković|dinamo-zagreb
PER|Santiago Acasiete|juan-pablo-ii
COL|Santiago Escobar|orense-sc
SLV|Saul Prucedino|municipal-limeno
GRE|Savvas Pantelidis|asteras-tripolis
ENG|Scott Parker|burnley
ENG|Sean Dyche|nottingham-forest
ARG|Sebastian Bini|municipal
COL|Sebastián Botero|independiente-medellin
URU|Sebastián Díaz|plaza-colonia
ARG|Sebastián Méndez|juventud
CHI|Sebastián Núñez|abb
COL|Sebastián Oliveros|fortaleza-ceif
URU|Sebastián Vázquez|general-caballero-jlm
FRA|Sébastien Mazeyrat|clermont-foot
ECU|Segundo Castillo|barcelona-sc
TUR|Selçuk Şahin|eyupspor
PAR|Sergio Aquino|libertad-asuncion
POR|Sérgio Conceição|al-ittihad
POR|Sérgio Fonseca|academico-viseu
ESP|Sergio González|cadiz
COL|Sergio Herrera|deportivo-cali
SLV|Sergio Iván Muñoz|aguila
NCA|Sergio Ivan Rodriguez|sebaco
URU|Sergio Órteman|san-lorenzo-paraguay
ESP|Sergio Pellicer|malaga
BOL|Sergio Zeballos|aurora-bolivia
TUR|Sertaç Küçükbayrak|amedspor
GEO|Shota Arveladze|kasimpasa
ITA|Silvio Baldini|pescara
BIH|Simo Krunić|ofk-beograd
SVN|Simon Rožman|osijek
ENG|Simon Rusk|southampton
CYP|Siniša Dobrašinović|radnicki-nis
IRN|Sirous Dinmohammadi|paykan
ESP|Sisi|valladolid
ECU|Sixto Vizuete|the-strongest
SRB|Slavko Matić|radnicki-1923
DEN|Søren Krogh|odense-boldklub
GRE|Sotiris Sylaidopoulos|rio-ave
RUS|Stanislav Cherchesov|akhmat
BEL|Stef Wils|royal-antwerp
SWE|Stefan Billborn|ifk-goteborg
AUT|Stefan Kulovits|austria-wien
IDN|Stefano Cugurra|bali-united
ITA|Stefano Pioli|fiorentina
SUI|Stephan Lichtsteiner|fc-basel
FRA|Stéphane Le Mignan|metz
USA|Steve Cherundolo|los-angeles-fc
BEL|Steve Colpaert|sv-zulte-waregem
WAL|Steve Cooper|brondby-if
ENG|Steve Holland|yokohama-f-marinos
SCO|Steven Smith|rangers
NCA|Sting Cruz|walter-ferretti
NCA|Sting Lopez|walter-ferretti
CRO|Stjepan Tomas|otelul-galati
SCO|Stuart Kettlewell|kilmarnock
CHN|Su Maozhen|shandong-taishan
BEL|Sven Vandenbroeck|sv-zulte-waregem
JPN|Tadahiro Akiba|shimizu-s-pulse
GRE|Takis Lemonis|radnicki-nis
EGY|Tamer Abdel Hamid|zamalek
EGY|Tamer Moustafa|al-ittihad-alexandria
EGY|Tarek El Ashry|al-masry
EGY|Tariq Mustafa|national-bank-of-egypt
JPN|Tatsuma Yoshida|kyoto-sanga
JPN|Tatsuya Tanaka|urawa-reds
PER|Teddy Ramírez|adt-peru
BRA|Thiago Carvalho|vila-nova
BRA|Thiago Leitão|independiente-petrolero
DEN|Thomas Frank|tottenham
SUI|Thomas Häberli|servette-fc
NOR|Thomas Holm|kfum
GER|Thorsten Fink|samsunspor
BRA|Tiago Nunes|ldu-de-quito
ENG|Tom Cleverley|watford
CZE|Tomáš Galásek|banik-ostrava
CZE|Tomáš Janotka|sigma-olomouc
GER|Tomas Oral|grasshopper
CZE|Tomáš Palinek|slovacko
CZE|Tomáš Trucha|psm-makassar
POL|Tomasz Grzegorczyk|pogon-szczecin
POL|Tomasz Kaczmarek|radomiak-radom
CRO|Tomislav Radotić|osijek
SRB|Tomislav Sivić|radnicki-nis
SCO|Tony Docherty|dundee
PAR|Troadio Duarte|san-lorenzo-paraguay
NOR|Trond Strande|molde
USA|Troy Lesesne|dc-united
SWE|Ulf Kristiansson Fredrik Landén|if-brommapojkarna
IDN|Uston Nawawi|persebaya-surabaya
GER|Uwe Rösler|agf
RUS|Vadim Romanov|spartak-moscow
BIH|Vahid Halilhodžić|nantes
IRN|Vahid Hashemian|persepolis
FRA|Valérien Ismaël|blackburn
ITA|Vanni Sartini|vancouver-whitecaps
POR|Vasco Faísca|puerto-cabello-b
POR|Vasco Matos|estoril
UKR|Vasyl Baranov|kudrivka
ESP|Vicente Moreno|osasuna
ESP|Vicente Parras|teruel
URU|Vicente Sánchez|emelec
PER|Víctor Balta|fbc-melgar
SLV|Victor Coreas|cacahuatique
CHI|Víctor Fuentes|ohiggins
ARG|Víctor Hugo Andrada|oriente-petrolero
BOL|Víctor Hugo Mamani|abb
ESP|Víctor Sánchez|rijeka
ITA|Vincenzo Vivarini|pescara
UKR|Vitaliy Kostyshyn|kudrivka
POR|Vítor Pereira|nottingham-forest
BIH|Vladimir Slišković|orenburg
BOL|Vladimir Soria|bolivar
UKR|Vladyslav Lupashko|karpaty-lviv
TUR|Volkan Demirel|genclerbirligi
SRB|Vujadin Radenković|fk-mladost-lucani
ARG|Walter Erviti|belgrano
BOL|Wálter Flores|universitario-de-vinto
ARG|Walter Lemma|deportes-concepcion
URU|Walter Pandiani|miramar-misiones
ARG|Walter Paolella|los-chankas
ARG|Walter Zunino|platense
AUS|Warren Moon|central-coast-mariners
BRA|Wesley Carvalho|cruzeiro
IDN|Widodo Cahyono Putro|persijap-jepara
COL|Wilbert Perea|bucaramanga
FRA|Wilfried Nancy|columbus-crew
BRA|William Batista|corinthians
SWE|William Lundin|degerfors-if
BEL|Yannick Ferrera|zamalek
BUL|Yasen Petrov|qingdao-hainiu
UKR|Yuriy Vernydub|kryvbas-kryvyi-rih
SRB|Žarko Lazetić|al-taawoun
RUS|Zaur Tedeyev|akron
BRA|Zé Ricardo|sporting-cristal
TUR|Zeki Murat Göle|fenerbahce
CRO|Željko Sopić|widzew-lodz
SRB|Zoran Vasiljević|fk-imt`;
    // Today's players who could be managing by the second half of a career (twenty-second round, Chirp): 300 famous
    // players born 1983-1996 who have never managed (and aren't in the lists above), read from English Wikipedia on
    // 7 Nov 2026 (their infoboxes; CC BY-SA 4.0): `country|name|the club he's most tied to (his longest spell)|born`.
    // From the 100+ caps list and a sample of the big leagues' players, most famous first (article length), at most 24 a
    // country. Each one starts coaching at 38-44 (seeded per career, coachDebut) and joins the out-of-work managers
    const FUTURE_MANAGERS = `
CAN|Atiba Hutchinson|besiktas|1983
GER|Christian Pander|fc-schalke-04|1983
CHI|Claudio Bravo|real-sociedad|1983
USA|Clint Dempsey|seattle-sounders|1983
BRA|Dani Alves|barcelona|1983
BUL|Dimitar Rangelov|konyaspor|1983
MKD|Goran Pandev|genoa|1983
CHI|Jorge Valdivia|palmeiras|1983
IRL|Keith Fahey|birmingham|1983
HON|Maynor Figueroa|olimpia-hon|1983
POR|Pepe|real-madrid|1983
GER|Philipp Lahm|bayern-munchen|1983
EGY|Ahmed Fathy|al-ahly|1984
SWE|Alexander Farnerud|torino|1984
OMA|Amad Al-Hosni|al-ahli|1984
UKR|Andriy Pyatov|shakhtar-donetsk|1984
NGA|Bartholomew Ogbeche|paris-saint-germain|1984
GER|Bastian Schweinsteiger|bayern-munchen|1984
HON|Boniek García|houston-dynamo|1984
SRB|Branislav Ivanović|chelsea|1984
EST|Dmitri Kruglov|lokomotiv-moscow|1984
SUI|Eldin Jakupović|hull-city|1984
CHI|Jean Beausejour|universidad-de-chile|1984
PER|Jefferson Farfán|fc-schalke-04|1984
SLE|Kei Kamara|sporting-kansas-city|1984
USA|Michael Parkhurst|new-england-revolution|1984
COM|Nadjim Abdou|millwall|1984
IRQ|Nashat Akram|al-shabab|1984
PER|Paolo Guerrero|hamburger-sv|1984
BRA|Robinho|ac-milan|1984
SVN|Samir Handanović|inter|1984
KSA|Taisir Al-Jassim|al-ahli|1984
BRA|Thiago Silva|paris-saint-germain|1984
NED|Wesley Sneijder|ajax|1984
ECU|Antonio Valencia|manchester-united|1985
GHA|Asamoah Gyan|udinese|1985
POR|Cristiano Ronaldo|real-madrid|1985
BRA|Diego Tardelli|sao-paulo|1985
GRE|Georgios Samaras|celtic|1985
CHI|Gonzalo Jara|huachipato|1985
MEX|Guillermo Ochoa|club-america|1985
POL|Jakub Błaszczykowski|borussia-dortmund|1985
CRO|Luka Modrić|real-madrid|1985
GER|Lukas Podolski|gornik-zabrze|1985
GRE|Orestis Karnezis|udinese|1985
EST|Ragnar Klavan|fc-augsburg|1985
SCO|Ross Wallace|burnley|1985
CIV|Salomon Kalou|chelsea|1985
GRE|Vasilis Torosidis|olympiacos|1985
SUI|Almen Abdi|fc-zurich|1986
CAN|André Hainault|houston-dynamo|1986
HUN|Balázs Dzsudzsák|dynamo-moscow|1986
COL|Carlos Sánchez|aston-villa|1986
IRL|Conor Sammon|derby|1986
ESP|David Silva|manchester-city|1986
ALG|Djamel Abdoun|nottingham-forest|1986
ITA|Éder|sampdoria|1986
BIH|Edin Džeko|as-roma|1986
HON|Emilio Izaguirre|motagua|1986
URU|Fernando Muslera|galatasaray|1986
CHN|Gao Lin|shanghai-shenhua|1986
FRA|Hugo Lloris|tottenham|1986
NED|Ibrahim Afellay|barcelona|1986
RUS|Igor Akinfeev|cska-moscow|1986
POR|João Moutinho|sporting-lisboa|1986
DEN|Kasper Schmeichel|manchester-city|1986
CRC|Keylor Navas|paris-saint-germain|1986
POR|Manuel Fernandes|lokomotiv-moscow|1986
GER|Manuel Neuer|bayern-munchen|1986
USA|Maurice Edu|philadelphia-union|1986
POR|Nani|manchester-united|1986
FRA|Olivier Giroud|arsenal|1986
COL|Radamel Falcao|monaco|1986
PAN|Román Torres|seattle-sounders|1986
ESP|Sergio Ramos|real-madrid|1986
FRA|Younes Kaboul|tottenham|1986
JPN|Yūto Nagatomo|inter|1986
CHI|Arturo Vidal|juventus|1987
ARG|Claudio Yacob|racing-club|1987
BEL|Dries Mertens|napoli|1987
URU|Edinson Cavani|paris-saint-germain|1987
CHI|Gary Medel|bologna|1987
ESP|Gerard Piqué|barcelona|1987
BEL|Jan Vertonghen|tottenham|1987
BRA|Jô|atletico-mg|1987
IRL|Jonny Hayes|aberdeen|1987
FRA|Kevin Gameiro|rc-strasbourg|1987
SCO|Lee Wallace|rangers|1987
ARG|Lionel Messi|barcelona|1987
URU|Luis Suárez|barcelona|1987
BOL|Marcelo Martins Moreno|gremio|1987
CIV|Max Gradel|saint-etienne|1987
KOR|Park Joo-ho|borussia-dortmund|1987
CIV|Seydou Doumbia|cska-moscow|1987
WAL|Wayne Hennessey|crystal-palace|1987
CHI|Alexis Sánchez|udinese|1988
IRN|Alireza Haghighi|persepolis|1988
ITA|Andrea Ranocchia|inter|1988
ARG|Ángel Di María|paris-saint-germain|1988
MLI|Bakary Sako|crystal-palace|1988
ISL|Birkir Bjarnason|viking|1988
CRC|Celso Borges|alajuelense|1988
COL|David Ospina|nice|1988
SRB|Dušan Tadić|ajax|1988
CHI|Fernando Zampedri|rosario-central|1988
PAN|Gabriel Torres|colorado-rapids|1988
NED|Gregory van der Wiel|ajax|1988
MEX|Héctor Moreno|monterrey|1988
ALG|Islam Slimani|sporting-lisboa|1988
CRO|Ivan Rakitić|barcelona|1988
MEX|Javier Hernández|manchester-united|1988
NIR|Jonny Evans|manchester-united|1988
COL|Juan Cuadrado|juventus|1988
FIN|Jukka Raitala|heerenveen|1988
POL|Kamil Glik|torino|1988
POL|Kamil Grosicki|pogon-szczecin|1988
POL|Kamil Wilczek|brondby-if|1988
SRB|Ljubomir Fejsa|benfica|1988
CHI|Mauricio Isla|juventus|1988
JPN|Maya Yoshida|southampton|1988
ARG|Nicolás Gaitán|benfica|1988
ARG|Nicolás Otamendi|benfica|1988
CRO|Nikola Kalinić|hajduk-split|1988
POL|Robert Lewandowski|bayern-munchen|1988
CRC|Rodney Wallace|portland-timbers|1988
POR|Rui Patrício|sporting-lisboa|1988
ARG|Sergio Agüero|manchester-city|1988
GRE|Sokratis Papastathopoulos|borussia-dortmund|1988
VEN|Tomás Rincón|santos|1988
SWE|Albin Ekdal|sampdoria|1989
ISL|Alfreð Finnbogason|fc-augsburg|1989
GHA|André Ayew|olympique-de-marseille|1989
UKR|Andriy Yarmolenko|dynamo-kyiv|1989
ISL|Aron Gunnarsson|cardiff|1989
BEL|Axel Witsel|standard-liege|1989
ISR|Ben Sahar|espanyol|1989
PER|Carlos Zambrano|eintracht-frankfurt|1989
CHI|Charles Aránguiz|bayer-leverkusen|1989
SLV|Darwin Cerén|houston-dynamo|1989
CRO|Domagoj Vida|dynamo-kyiv|1989
CHI|Eduardo Vargas|atletico-mg|1989
ECU|Enner Valencia|fenerbahce|1989
USA|Freddy Adu|benfica|1989
WAL|Gareth Bale|real-madrid|1989
MEX|Giovani dos Santos|tottenham|1989
SEN|Idrissa Gueye|lille|1989
CRO|Ivan Perišić|inter|1989
IRL|James McClean|wrexham|1989
SWE|Joel Ekstrand|watford|1989
USA|Jozy Altidore|toronto-fc|1989
KOR|Ki Sung-yueng|swansea|1989
FIN|Lukas Hradecky|bayer-leverkusen|1989
CAN|Marcus Haber|dundee|1989
AUT|Marko Arnautović|stoke-city|1989
VEN|Salomón Rondón|cf-pachuca|1989
EST|Sergei Zenjov|karpaty-lviv|1989
JPN|Shinji Kagawa|borussia-dortmund|1989
DEN|Simon Kjær|ac-milan|1989
SRB|Slobodan Rajković|hamburger-sv|1989
GER|Thomas Müller|bayern-munchen|1989
BEL|Toby Alderweireld|tottenham|1989
CHN|Zhang Linpeng|shanghai-port|1989
URU|Abel Hernández|central-espanol|1990
PAN|Aníbal Godoy|nashville-sc|1990
NED|Daley Blind|ajax|1990
ITA|Diego Fabbrini|watford|1990
IRN|Ehsan Hajsafi|sepahan|1990
BRA|Fabio|manchester-united|1990
URU|Gastón Ramírez|sampdoria|1990
NED|Georginio Wijnaldum|liverpool|1990
GRE|Giannis Fetfatzidis|olympiacos|1990
POL|Grzegorz Krychowiak|paris-saint-germain|1990
MEX|Héctor Herrera|porto|1990
EST|Henri Anier|viking|1990
ISL|Jóhann Berg Guðmundsson|burnley|1990
KOR|Kim Young-gwon|ulsan-hd|1990
ENG|Kyle Walker|manchester-city|1990
PER|Luis Advíncula|boca-juniors|1990
NOR|Magnus Wolff Eikrem|molde|1990
FRA|Mamadou Sakho|paris-saint-germain|1990
BIH|Miralem Pjanić|as-roma|1990
NED|Patrick van Aanholt|chelsea|1990
PER|Pedro Gallese|usmdp|1990
FIN|Teemu Pukki|norwich|1990
GER|Toni Kroos|real-madrid|1990
FRA|Yann M'Vila|rubin-kazan|1990
PER|Yoshimar Yotún|sporting-cristal|1990
AUT|Aleksandar Dragović|bayer-leverkusen|1991
SWE|Alexander Kačaniklić|fulham|1991
PER|André Carrillo|sporting-lisboa|1991
CRO|Andrej Kramarić|1899-hoffenheim|1991
FRA|Antoine Griezmann|atletico-madrid|1991
NZL|Chris Wood|burnley|1991
PER|Christian Cueva|usmdp|1991
BEL|Christian Kabasele|watford|1991
BEL|Eden Hazard|chelsea|1991
LTU|Fedor Černych|jagiellonia-bialystok|1991
COD|Gaël Kakuta|chelsea|1991
COL|James Rodríguez|real-madrid|1991
FRO|Jóan Símun Edmundsson|sk-beveren|1991
GHA|Jordan Ayew|crystal-palace|1991
SEN|Kalidou Koulibaly|napoli|1991
BEL|Kevin De Bruyne|manchester-city|1991
FRA|N'Golo Kanté|chelsea|1991
POR|Nélson Oliveira|benfica|1991
MEX|Raúl Jiménez|benfica|1991
ALG|Riyad Mahrez|manchester-city|1991
KSA|Salem Al-Dawsari|al-hilal|1991
KEN|Victor Wanyama|cf-montreal|1991
NED|Virgil van Dijk|liverpool|1991
CHN|Wu Lei|shanghai-port|1991
SUI|Xherdan Shaqiri|liverpool|1991
NGA|Ahmed Musa|cska-moscow|1992
BRA|Alex Telles|porto|1992
DEN|Christian Eriksen|tottenham|1992
AUT|David Alaba|bayern-munchen|1992
CRC|Francisco Calvo|chicago-fire-fc|1992
SUI|Granit Xhaka|arsenal|1992
FRO|Hallur Hansson|horsens|1992
AUS|Jimmy Jeggo|melbourne-victory|1992
CRC|Joel Campbell|arsenal|1992
GRE|Kyriakos Papadopoulos|fc-schalke-04|1992
KOR|Lee Jae-sung|jeonbuk|1992
GER|Marc-André ter Stegen|barcelona|1992
AUS|Mathew Ryan|brighton|1992
ALG|Mehdi Abeid|newcastle|1992
IRN|Mehdi Taremi|porto|1992
BLZ|Michael Salazar|los-angeles-fc|1992
EGY|Mohamed Elneny|arsenal|1992
EGY|Mohamed Salah|liverpool|1992
NOR|Mushaga Bakenga|club-brugge|1992
BRA|Neymar|paris-saint-germain|1992
ARG|Nicolás Tagliafico|banfield|1992
SUI|Pajtim Kasami|fc-sion|1992
POL|Paweł Wszołek|sampdoria|1992
SUI|Ricardo Rodriguez|torino|1992
NEP|Rohit Chand|persija-jakarta|1992
SEN|Sadio Mané|liverpool|1992
JPN|Shoma Doi|kashima-antlers|1992
KOR|Son Heung-min|tottenham|1992
LBN|Soony Saad|sporting-kansas-city|1992
BEL|Thibaut Courtois|real-madrid|1992
BEL|Thomas Kaminski|anderlecht|1992
CMR|Vincent Aboubakar|porto|1992
IRN|Alireza Jahanbakhsh|feyenoord|1993
WAL|Ben Davies|tottenham|1993
MEX|Carlos Salcedo|tigres-uanl|1993
COL|Deiver Machado|atletico-nacional|1993
BRA|Ederson|manchester-city|1993
ENG|Harry Kane|tottenham|1993
POR|José Sá|porto|1993
EST|Karol Mets|viking|1993
BEL|Romelu Lukaku|everton|1993
SUI|Silvan Widmer|fsv-mainz-05|1993
CZE|Tomáš Kalas|chelsea|1993
DEN|Uffe Bech|panathinaikos|1993
PAN|Yoel Bárcenas|arabe-unido|1993
SRB|Aleksandar Mitrović|fulham|1994
SCO|Andy Robertson|liverpool|1994
POR|Bernardo Silva|manchester-city|1994
COD|Chancel Mbemba|porto|1994
ALB|Elseid Hysaj|napoli|1994
TUR|Hakan Çalhanoğlu|inter|1994
MEX|Jesús Gallardo|monterrey|1994
ARG|Lucas Ocampos|olympique-de-marseille|1994
URU|Lucas Olaza|river-plate-montevideo|1994
AUT|Marcel Sabitzer|rb-leipzig|1994
CRO|Mateo Kovačić|chelsea|1994
NED|Memphis Depay|olympique-lyonnais|1994
POL|Piotr Zieliński|napoli|1994
EGY|Trézéguet|al-ahly|1994
DEN|Viktor Fischer|ajax|1994
NED|Vincent Janssen|monterrey|1994
MTN|Aboubakar Kamara|monaco|1995
NOR|Bård Finne|brann|1995
ARM|Edgar Babayan|randers-fc|1995
PAN|Fidel Escobar|saprissa|1995
LUX|Gerson Rodrigues|dynamo-kyiv|1995
ISL|Hjörtur Hermannsson|brondby-if|1995
URU|José María Giménez|atletico-madrid|1995
GER|Joshua Kimmich|bayern-munchen|1995
SWE|Niclas Eliasson|bristol-city|1995
DEN|Pierre-Emile Højbjerg|tottenham|1995
CAN|Raheem Edwards|toronto-fc|1995
JAM|Rolando Aarons|newcastle|1995
SLE|Sullay Kaikai|crystal-palace|1995
CRO|Tin Jedvaj|bayer-leverkusen|1995
QAT|Akram Afif|villarreal|1996
HON|Alberth Elis|olimpia-hon|1996
NGA|Alex Iwobi|everton|1996
QAT|Almoez Ali|lask|1996
SWE|Anton Salétros|aik|1996
SEN|Bingourou Kamara|rc-strasbourg|1996
JPN|Daichi Kamada|eintracht-frankfurt|1996
COL|Davinson Sánchez|tottenham|1996
CIV|Franck Kessié|atalanta|1996
ENG|Harry Winks|tottenham|1996
PAN|Michael Amir Murillo|olympique-de-marseille|1996
SRB|Nemanja Radonjić|olympique-de-marseille|1996
ISR|Shon Weissman|valladolid|1996`;

