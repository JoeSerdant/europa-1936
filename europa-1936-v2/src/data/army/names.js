// Jména velitelů: kultura → křestní jména a příjmení. Jména se skládají náhodně (vymyšlené osoby, bez historických velitelů).

export const NAMES = {
  de: {
    first: ['Hans', 'Karl', 'Friedrich', 'Walter', 'Ernst', 'Otto', 'Wilhelm', 'Georg', 'Paul', 'Heinrich', 'Kurt', 'Albrecht', 'Konrad', 'Rudolf', 'Max', 'Ludwig'],
    last: ['Becker', 'Hartmann', 'Lindner', 'Vogel', 'Brandt', 'Köhler', 'Weber', 'Roth', 'Sommer', 'Engel', 'Falk', 'Jäger', 'Krause', 'Lang', 'Neumann', 'Ostermann', 'Pohl', 'Reuter', 'Scholz', 'Thiele', 'Ulrich', 'Voss', 'Winkler', 'Ziegler'],
  },
  fr: {
    first: ['Henri', 'Louis', 'Pierre', 'Jean', 'Charles', 'Georges', 'Maurice', 'Gaston', 'André', 'Émile', 'Paul', 'Marcel', 'Lucien', 'Raoul', 'Édouard', 'Albert'],
    last: ['Lefèvre', 'Moreau', 'Fournier', 'Girard', 'Bonnet', 'Dupont', 'Lambert', 'Mercier', 'Rousseau', 'Vidal', 'Garnier', 'Chevalier', 'Perrin', 'Colin', 'Marchand', 'Besson', 'Roux', 'Leclerc', 'Aubert', 'Delmas', 'Fabre', 'Giraud', 'Hamel', 'Lacroix'],
  },
  en: {
    first: ['Edmund', 'Henry', 'Arthur', 'William', 'Reginald', 'Charles', 'Harold', 'John', 'Richard', 'Douglas', 'Geoffrey', 'Cecil', 'Hugh', 'Percy', 'Walter', 'Oliver'],
    last: ['Ashford', 'Barlow', 'Carrington', 'Dalton', 'Ellis', 'Fairfax', 'Granger', 'Hartley', 'Ingram', 'Kendal', 'Lowell', 'Mortimer', 'Norwood', 'Overton', 'Pembroke', 'Radcliffe', 'Sutton', 'Thornton', 'Underwood', 'Vance', 'Whitmore', 'Yardley', 'Blackwell', 'Clifton'],
  },
  ga: {
    first: ['Seán', 'Patrick', 'Michael', 'Liam', 'Eoin', 'Cathal', 'Donal', 'Brendan', 'Padraig', 'Ciarán', 'Dermot', 'Fergus'],
    last: ['O’Brien', 'Murphy', 'Kelly', 'Doyle', 'Byrne', 'Quinn', 'Gallagher', 'Brennan', 'Maguire', 'Fitzgerald', 'Nolan', 'Reilly', 'Kavanagh', 'Daly', 'Whelan', 'Mulcahy'],
  },
  nl: {
    first: ['Johan', 'Willem', 'Pieter', 'Hendrik', 'Cornelis', 'Jacob', 'Adriaan', 'Gerrit', 'Maarten', 'Dirk', 'Jan', 'Albert'],
    last: ['de Vries', 'van Dijk', 'Bakker', 'Visser', 'Smit', 'Meijer', 'de Boer', 'Mulder', 'de Groot', 'Bos', 'Vermeulen', 'van den Berg', 'Peeters', 'Janssens', 'Maes', 'Claes', 'Willems', 'Jacobs', 'Dewulf', 'Lambrecht'],
  },
  it: {
    first: ['Alberto', 'Giovanni', 'Mario', 'Ugo', 'Guido', 'Enrico', 'Carlo', 'Pietro', 'Vittorio', 'Emilio', 'Luigi', 'Roberto', 'Annibale', 'Ettore', 'Francesco', 'Italo'],
    last: ['Ferrari', 'Conti', 'Bianchi', 'Marino', 'Greco', 'Rinaldi', 'Caruso', 'Fabbri', 'Moretti', 'Barbieri', 'Gallo', 'Serra', 'Lombardi', 'Costa', 'Ricci', 'Santoro', 'Valle', 'Bruni', 'De Angelis', 'Fontana', 'Pellegrini', 'Rossetti', 'Sala', 'Testa'],
  },
  es: {
    first: ['José', 'Manuel', 'Miguel', 'Francisco', 'Antonio', 'Emilio', 'Fernando', 'Luis', 'Rafael', 'Carlos', 'Joaquín', 'Ramón', 'Enrique', 'Alfonso'],
    last: ['García', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Romero', 'Navarro', 'Ortega', 'Castro', 'Vega', 'Molina', 'Iglesias', 'Campos', 'Herrera', 'Medina', 'Aguirre', 'Bravo', 'Cortés', 'Delgado', 'Escobar', 'Fuentes', 'Gallego', 'Ibáñez', 'Jiménez'],
  },
  pt: {
    first: ['António', 'José', 'Manuel', 'João', 'Joaquim', 'Francisco', 'Carlos', 'Fernando', 'Henrique', 'Álvaro', 'Rui', 'Duarte'],
    last: ['Silva', 'Santos', 'Ferreira', 'Pereira', 'Oliveira', 'Costa', 'Rodrigues', 'Martins', 'Sousa', 'Gonçalves', 'Almeida', 'Carvalho', 'Teixeira', 'Moreira', 'Cunha', 'Pinto'],
  },
  sc: {
    first: ['Anders', 'Erik', 'Lars', 'Nils', 'Olaf', 'Carl', 'Gustav', 'Harald', 'Jens', 'Knud', 'Magnus', 'Sven', 'Thorvald', 'Axel'],
    last: ['Andersen', 'Berg', 'Dahl', 'Eriksen', 'Fjeld', 'Gran', 'Holm', 'Isaksen', 'Jensen', 'Larsen', 'Lund', 'Nygaard', 'Olsen', 'Pedersen', 'Strand', 'Thorsen', 'Vik', 'Winge', 'Ekberg', 'Lindgren', 'Nordin', 'Sandberg', 'Wallin', 'Åberg'],
  },
  fi: {
    first: ['Juhani', 'Matti', 'Antti', 'Eino', 'Väinö', 'Kaarlo', 'Aarne', 'Heikki', 'Paavo', 'Taavetti', 'Urho', 'Erkki'],
    last: ['Virtanen', 'Korhonen', 'Mäkinen', 'Laine', 'Hakala', 'Ahola', 'Salmi', 'Heinonen', 'Niemi', 'Rantanen', 'Kallio', 'Lehtinen', 'Saarinen', 'Koskinen', 'Mattila', 'Tuominen'],
  },
  ee: {
    first: ['Jaan', 'Peeter', 'Johan', 'Karl', 'Mihkel', 'Jüri', 'Tõnis', 'Ants', 'Ruudolf', 'Voldemar'],
    last: ['Tamm', 'Saar', 'Sepp', 'Mägi', 'Kask', 'Kukk', 'Rebane', 'Ilves', 'Koppel', 'Luik', 'Pärn', 'Raud', 'Lepik', 'Mets', 'Oja', 'Vaher'],
  },
  lv: {
    first: ['Jānis', 'Pēteris', 'Kārlis', 'Andrejs', 'Mārtiņš', 'Oskars', 'Roberts', 'Voldemārs', 'Jēkabs', 'Arvīds'],
    last: ['Bērziņš', 'Kalniņš', 'Ozoliņš', 'Liepiņš', 'Krūmiņš', 'Balodis', 'Zariņš', 'Vītols', 'Siliņš', 'Egle', 'Ziemelis', 'Jansons', 'Grīnbergs', 'Ķirsis', 'Lapiņš', 'Dzenis'],
  },
  lt: {
    first: ['Jonas', 'Antanas', 'Petras', 'Kazys', 'Vytautas', 'Stasys', 'Juozas', 'Algirdas', 'Povilas', 'Mykolas'],
    last: ['Kazlauskas', 'Petrauskas', 'Jankauskas', 'Butkus', 'Paulauskas', 'Urbonas', 'Navickas', 'Vasiliauskas', 'Žukauskas', 'Rimkus', 'Stankevičius', 'Balčiūnas', 'Gudaitis', 'Mockus', 'Norkus', 'Sakalas'],
  },
  pl: {
    first: ['Jan', 'Stanisław', 'Tadeusz', 'Władysław', 'Józef', 'Kazimierz', 'Zygmunt', 'Antoni', 'Edward', 'Bolesław', 'Wacław', 'Leon', 'Franciszek'],
    last: ['Kowalski', 'Nowak', 'Wiśniewski', 'Wójcik', 'Kamiński', 'Lewandowski', 'Zieliński', 'Szymański', 'Woźniak', 'Dąbrowski', 'Kozłowski', 'Jankowski', 'Mazur', 'Krawczyk', 'Piotrowski', 'Grabowski', 'Pawlak', 'Michalski', 'Zając', 'Król', 'Wieczorek', 'Jabłoński', 'Wróbel', 'Majewski'],
  },
  cz: {
    first: ['Jan', 'Josef', 'Karel', 'František', 'Václav', 'Antonín', 'Jaroslav', 'Vladimír', 'Alois', 'Bohumil', 'Emil', 'Rudolf', 'Stanislav'],
    last: ['Novák', 'Svoboda', 'Novotný', 'Dvořák', 'Černý', 'Procházka', 'Kučera', 'Veselý', 'Horák', 'Němec', 'Pokorný', 'Marek', 'Pospíšil', 'Hájek', 'Jelínek', 'Král', 'Růžička', 'Beneš', 'Fiala', 'Sedláček', 'Doležal', 'Zeman', 'Kolář', 'Navrátil'],
  },
  hu: {
    first: ['István', 'János', 'László', 'Ferenc', 'Gyula', 'Béla', 'Sándor', 'Károly', 'Zoltán', 'Imre', 'Lajos', 'József'],
    last: ['Nagy', 'Kovács', 'Tóth', 'Szabó', 'Horváth', 'Varga', 'Kiss', 'Molnár', 'Németh', 'Farkas', 'Balogh', 'Papp', 'Takács', 'Juhász', 'Mészáros', 'Oláh', 'Simon', 'Rácz', 'Fekete', 'Szilágyi', 'Török', 'Fehér', 'Gál', 'Lakatos'],
  },
  ro: {
    first: ['Ion', 'Gheorghe', 'Nicolae', 'Constantin', 'Alexandru', 'Dumitru', 'Mihai', 'Vasile', 'Traian', 'Ștefan', 'Radu', 'Petre'],
    last: ['Popescu', 'Ionescu', 'Popa', 'Stan', 'Dumitrescu', 'Georgescu', 'Constantinescu', 'Marin', 'Munteanu', 'Stoica', 'Radu', 'Moldovan', 'Dobre', 'Barbu', 'Ciobanu', 'Preda', 'Neagu', 'Matei', 'Lupu', 'Vasilescu', 'Tudor', 'Cristea', 'Dinu', 'Sandu'],
  },
  sr: {
    first: ['Petar', 'Milan', 'Dragutin', 'Stevan', 'Nikola', 'Dušan', 'Ivan', 'Josip', 'Mihailo', 'Branko', 'Vladimir', 'Anton'],
    last: ['Jovanović', 'Petrović', 'Nikolić', 'Marković', 'Đorđević', 'Stojanović', 'Ilić', 'Pavlović', 'Kovačević', 'Horvat', 'Novak', 'Babić', 'Knežević', 'Matić', 'Tomić', 'Vukelić', 'Božić', 'Lazić', 'Simić', 'Radić', 'Kos', 'Zupan', 'Perić', 'Mitrović'],
  },
  bg: {
    first: ['Ivan', 'Georgi', 'Dimitar', 'Petar', 'Nikola', 'Stefan', 'Kiril', 'Boris', 'Todor', 'Vasil', 'Hristo', 'Atanas'],
    last: ['Ivanov', 'Georgiev', 'Dimitrov', 'Petrov', 'Nikolov', 'Stoyanov', 'Todorov', 'Kostov', 'Angelov', 'Yordanov', 'Hristov', 'Popov', 'Vasilev', 'Marinov', 'Draganov', 'Simeonov'],
  },
  el: {
    first: ['Georgios', 'Ioannis', 'Konstantinos', 'Dimitrios', 'Nikolaos', 'Panagiotis', 'Alexandros', 'Theodoros', 'Spyridon', 'Vasileios', 'Stylianos'],
    last: ['Papadopoulos', 'Karagiannis', 'Vlachos', 'Georgiadis', 'Nikolaidis', 'Makris', 'Anagnostou', 'Theodorou', 'Kostopoulos', 'Mavros', 'Sotiriou', 'Angelopoulos', 'Pappas', 'Economou', 'Ioannidis', 'Kalogeras'],
  },
  sq: {
    first: ['Ahmet', 'Mehmet', 'Xhemal', 'Gjon', 'Zef', 'Prenk', 'Hysen', 'Rexhep', 'Llesh', 'Shaban'],
    last: ['Hoxha', 'Krasniqi', 'Gjoka', 'Berisha', 'Shehu', 'Dervishi', 'Leka', 'Dedja', 'Cani', 'Marku', 'Prifti', 'Zogu'],
  },
  tr: {
    first: ['Mehmet', 'Ahmet', 'Ali', 'Mustafa', 'Hasan', 'İbrahim', 'Cemal', 'Kâzım', 'Fahri', 'Salih', 'Nuri', 'Şükrü'],
    last: ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Aydın', 'Özdemir', 'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Kurt', 'Koç', 'Polat', 'Erdem', 'Güneş', 'Aksoy', 'Uçar', 'Tekin', 'Bozkurt', 'Karaca', 'Taş'],
  },
  ru: {
    first: ['Ivan', 'Nikolaj', 'Sergej', 'Michail', 'Alexej', 'Vasilij', 'Dmitrij', 'Pavel', 'Fjodor', 'Boris', 'Kirill', 'Konstantin', 'Leonid', 'Semjon'],
    last: ['Smirnov', 'Kuzněcov', 'Popov', 'Vasiljev', 'Petrov', 'Sokolov', 'Michajlov', 'Novikov', 'Fjodorov', 'Morozov', 'Volkov', 'Alexejev', 'Lebeděv', 'Semjonov', 'Jegorov', 'Pavlov', 'Kozlov', 'Stěpanov', 'Nikolajev', 'Orlov', 'Andrejev', 'Makarov', 'Zacharov', 'Belov'],
  },
  ar: {
    first: ['Ahmad', 'Muhammad', 'Mahmud', 'Ibrahim', 'Hasan', 'Salim', 'Yusuf', 'Abdallah', 'Faisal', 'Khalid', 'Nuri', 'Taha'],
    last: ['al-Hashimi', 'al-Rashid', 'al-Sayyid', 'al-Najjar', 'al-Tikriti', 'al-Masri', 'al-Qadir', 'al-Zahir', 'al-Hakim', 'al-Salih', 'al-Ghani', 'al-Mansur', 'al-Rahim', 'al-Karim'],
  },
  fa: {
    first: ['Mohammad', 'Ali', 'Hossein', 'Reza', 'Hasan', 'Abbas', 'Mahmud', 'Ahmad', 'Jafar', 'Morteza', 'Nasser'],
    last: ['Ahmadi', 'Rahimi', 'Karimi', 'Hosseini', 'Mousavi', 'Jafari', 'Rezai', 'Najafi', 'Kazemi', 'Tehrani', 'Shirazi', 'Esfahani', 'Tabrizi', 'Bakhtiar', 'Zand', 'Afshar'],
  },
};
