-- ════════════════════════════════════════════════════════════════════════════
-- v137 · LIMPIEZA DE MAYÚSCULAS Y MINÚSCULAS EN EL CRM
--
-- Holded manda las razones sociales en mayúsculas y la calculadora guarda lo
-- que teclea quien pide la oferta. A partir de la v137 todo entra limpio
-- (app/src/lib/capitalizar.js: «Academia Axon S.L.», correos en minúsculas,
-- CIF en mayúsculas). Esta migración deja igual lo que ya estaba.
--
-- Generada con esas mismas reglas sobre los datos del 11/09/2026. Cada update
-- lleva el valor anterior en el WHERE: si una fila cambió entre medias no se
-- toca. No hay cambios de esquema. Se puede ejecutar más de una vez.
--
-- Qué NO se toca: nombres ya escritos en mezcla de mayúsculas y minúsculas
-- (alguien los escribió así), siglas (CECE, HUFA, CNSE, BC), marcas de una
-- sola palabra en mayúsculas (AXON, TUCONSULTOR), formas jurídicas (SL, S.A.).
-- ════════════════════════════════════════════════════════════════════════════

-- ── empresas (48 filas) ──
update public.empresas set nombre = 'Trescore Proyectos de Innovación Tecnológica y Excelencia SL', direccion = 'Calle Fuente Cisneros, 66 - 7 D', poblacion = 'Alcorcón'
  where id = '46a10807-5d0d-4d5b-852c-569eadc96916' and nombre = 'TRESCORE PROYECTOS DE INNOVACION TECNOLOGICA Y EXCELENCIA SL' and direccion = 'CALLE FUENTE CISNEROS, 66 - 7 D' and poblacion = 'ALCORCON';
update public.empresas set nombre = 'Fundación de la Comunitat Valenciana para la Gestión del Instituto de Investigación Sanitaria y Bio', direccion = 'Avenida Pintor Baeza, 12', poblacion = 'Alicante/Alacant'
  where id = '46aa0ef0-df2d-455d-bfd6-20a7f2920326' and nombre = 'FUNDACION DE LA COMUNITAT VALENCIANA PARA LA GESTION DEL INSTITUTO DE INVESTIGACION SANITARIA Y BIO' and direccion = 'AVENIDA PINTOR BAEZA, 12' and poblacion = 'ALICANTE/ALACANT';
update public.empresas set nombre = 'Fundación General de la Universidad Politécnica de Madrid'
  where id = '225d4b3d-cde9-4009-a378-e1308020f3ce' and nombre = 'FUNDACION GENERAL DE LA UNIVERSIDAD POLITECNICA DE MADRID';
update public.empresas set nombre = 'Grupo BC de Asesoría Hipotecaria, S.L.'
  where id = 'f9f83793-4687-4b00-a485-fdbca3e66368' and nombre = 'GRUPO BC DE ASESORÍA HIPOTECARIA, S.L.';
update public.empresas set nombre = 'Avoris Retail División SL.', direccion = 'Calle Gremi de Fusters, 23'
  where id = 'a5ffe3f8-edf9-47a5-9d7f-9e164918d582' and nombre = 'AVORIS RETAIL DIVISION SL.' and direccion = 'CALLE GREMI DE FUSTERS, 23';
update public.empresas set nombre = 'Esla Centros de Formación SL', nombre_comercial = 'Grupo Esla', direccion = 'Calle Pablo Morillo, 25 - Bajo'
  where id = 'f0aa646d-5c33-4580-8bca-1095266991be' and nombre = 'ESLA CENTROS DE FORMACION SL' and nombre_comercial = 'GRUPO ESLA' and direccion = 'CALLE PABLO MORILLO, 25 - BAJO';
update public.empresas set nombre = 'Ayuntamiento de Guía de Isora', direccion = 'Calle del Ayuntamiento, 4'
  where id = 'cb291f01-7ea8-4a65-9cfc-ea1b4305e036' and nombre = 'AYUNTAMIENTO DE GUIA DE ISORA' and direccion = 'CALLE DEL AYUNTAMIENTO, 4';
update public.empresas set nombre = 'Club Financiero Génova', nombre_comercial = 'Club Financiero Génova', direccion = 'Calle Marqués de la Ensenada, 14', poblacion = 'Madrid'
  where id = '94914754-cbd6-4fa2-a6ce-3df8c69a3cec' and nombre = 'CLUB FINANCIERO GENOVA' and nombre_comercial = 'CLUB FINANCIERO GENOVA' and direccion = 'CALLE MARQUES DE LA ENSENADA, 14' and poblacion = 'MADRID';
update public.empresas set nombre = 'Diseñarte Informática y Comunicaciones SLL.', direccion = 'Calle Urano, 27 - Piso 2 Iz'
  where id = 'a4ace829-8f3e-40a3-b8df-8480c8ec1705' and nombre = 'DISEÑARTE INFORMATICA Y COMUNICACIONES SLL.' and direccion = 'CALLE URANO, 27 - PISO 2 IZ';
update public.empresas set nombre = 'Cecbaf Khalil Gibran SL', direccion = 'Calle de Turquía, 13', poblacion = 'Fuenlabrada'
  where id = '436a1c99-7975-49a6-87b2-2d2a7ae93661' and nombre = 'CECBAF KHALIL GIBRAN SL' and direccion = 'CALLE DE TURQUIA, 13' and poblacion = 'FUENLABRADA';
update public.empresas set nombre = 'Royal Mayline SL', nombre_comercial = 'R Mayline Royal Mayline, S.L.'
  where id = '9e474aa5-d0be-41cc-91ad-79adacd28de4' and nombre = 'ROYAL MAYLINE SL' and nombre_comercial = 'R MAYLINE ROYAL MAYLINE, S.L.';
update public.empresas set nombre = 'Confederación Española de Centros de Enseñanza'
  where id = 'e7147a15-eabc-4060-862d-04f07d9de439' and nombre = 'CONFEDERACION ESPAÑOLA DE CENTROS DE ENSEÑANZA';
update public.empresas set nombre = 'Rafa'
  where id = 'afca6025-f49b-429c-8914-ee33eff2727d' and nombre = 'rafa';
update public.empresas set nombre = 'Home Diagnostics SL'
  where id = '49192f41-13e4-4246-bded-add8250b33b5' and nombre = 'HOME DIAGNOSTICS SL';
update public.empresas set nombre = 'Organismo Autónomo Agencia Local de Empleo y Formación (ALEF)', direccion = 'Calle Díaz y Barcala, S/N', poblacion = 'Getafe'
  where id = 'a08978a1-a45b-424e-b4d5-1470bf01992c' and nombre = 'ORGANISMO AUTONOMO AGENCIA LOCAL DE EMPLEO Y FORMACION (ALEF)' and direccion = 'CALLE DIAZ Y BARCALA, S/N' and poblacion = 'GETAFE';
update public.empresas set nombre = 'Asociación Nuevo Horizonte', direccion = 'Calle Comunidad de Madrid, 43', poblacion = 'Las Rozas de Madrid'
  where id = '2f339a77-9502-4585-9ea9-4617528a4ab7' and nombre = 'ASOCIACION NUEVO HORIZONTE' and direccion = 'CALLE COMUNIDAD DE MADRID, 43' and poblacion = 'LAS ROZAS DE MADRID';
update public.empresas set nombre = 'Asoc para la Atención Prevención y Reinserción de la Mujer Prostituída'
  where id = 'f0ffc035-89c9-47f7-8c42-ad54df6a8c4c' and nombre = 'ASOC PARA LA ATENCION PREVENCION Y REINSERCION DE LA MUJER PROSTITUÍDA';
update public.empresas set nombre = 'Arnoia Distribución de Libros SA.', direccion = 'Lugar Reigosa, S/N - Parc. 19', poblacion = 'Ponte Caldelas'
  where id = '45fd1c67-274d-48c0-bec7-0c877b80d9f6' and nombre = 'ARNOIA DISTRIBUCION DE LIBROS SA.' and direccion = 'LUGAR REIGOSA, S/N - PARC. 19' and poblacion = 'PONTE CALDELAS';
update public.empresas set nombre = 'Grupo Educativo Ibadie SL.', direccion = 'Calle Mercedes, 19', poblacion = 'Madrid'
  where id = '98e3f53b-3540-41f3-bfac-4c2d7e694b35' and nombre = 'GRUPO EDUCATIVO IBADIE SL.' and direccion = 'CALLE MERCEDES, 19' and poblacion = 'MADRID';
update public.empresas set nombre = 'Aspasia Servicios de Marketing y Comunicación, S.L.', direccion = 'Paseo Alfredo Basanta, 4', poblacion = 'Valladolid'
  where id = 'a1c3378b-a703-4f6b-8807-2e03916ad89f' and nombre = 'ASPASIA SERVICIOS DE MARKETING Y COMUNICACIÓN, S.L.' and direccion = 'PASEO ALFREDO BASANTA, 4' and poblacion = 'VALLADOLID';
update public.empresas set nombre = 'Adalid Servicios Corporativos SL.', direccion = 'Calle Mercedes, 19', poblacion = 'Madrid'
  where id = 'be870071-a6ed-4c8f-90c0-b2dbe416270a' and nombre = 'ADALID SERVICIOS CORPORATIVOS SL.' and direccion = 'CALLE MERCEDES, 19' and poblacion = 'MADRID';
update public.empresas set nombre = 'Autoescuela Loeches SL'
  where id = '121c29fe-c38e-4fec-83a4-2ab4231282e3' and nombre = 'AUTOESCUELA LOECHES SL';
update public.empresas set nombre = 'Academia Axon S.L.', direccion = 'Calle Ruiz de Padrón, Loc 5', poblacion = 'San Sebastián de la Gomera'
  where id = 'e7d368e6-4da9-4f7b-878e-9c212d1dd77f' and nombre = 'ACADEMIA AXON S.L.' and direccion = 'CALLE RUIZ DE PADRON, LOC 5' and poblacion = 'SAN SEBASTIAN DE LA GOMERA';
update public.empresas set nombre = 'Ayuntamiento de Valverde', direccion = 'Calle los Barriales, 2', poblacion = 'Valverde'
  where id = 'a06a5cb0-7510-4c46-878c-6b936e550ec3' and nombre = 'AYUNTAMIENTO DE VALVERDE' and direccion = 'CALLE LOS BARRIALES, 2' and poblacion = 'VALVERDE';
update public.empresas set nombre = 'Awakelab'
  where id = '3bc25ce1-1325-402c-801c-84fedd408f0f' and nombre = 'AWAKELAB';
update public.empresas set nombre = 'BC Digital Services SL.', nombre_comercial = 'BC Digital'
  where id = '46e982ec-2d0d-4297-9651-9284ad76366a' and nombre = 'BC DIGITAL SERVICES SL.' and nombre_comercial = 'BC DIGITAL';
update public.empresas set nombre = 'Club Excelencia en Gestión Vía Innovación'
  where id = '8f94607a-ad97-4e93-af07-7646fb535614' and nombre = 'CLUB EXCELENCIA EN GESTION VIA INNOVACION';
update public.empresas set nombre = 'Centro de Iniciativas Profesionales S.L'
  where id = 'aa4d5288-afde-40b3-9b05-b6409c599d6a' and nombre = 'CENTRO DE INICIATIVAS PROFESIONALES S.L';
update public.empresas set nombre = 'Confederación Estatal de Personas Sordas'
  where id = 'f4d6a58d-7abe-4183-b84e-fcf12066f61b' and nombre = 'CONFEDERACIÓN ESTATAL DE PERSONAS SORDAS';
update public.empresas set nombre = 'Grupo Coremsa Formación y Tecnologías SL.', nombre_comercial = 'Grupo Coremsa', direccion = 'Calle Tomás Heredia, 12', poblacion = 'Málaga'
  where id = '0da372e2-1f54-4f47-8936-9deea1f91d9f' and nombre = 'GRUPO COREMSA FORMACION Y TECNOLOGIAS SL.' and nombre_comercial = 'GRUPO COREMSA' and direccion = 'CALLE TOMAS HEREDIA, 12' and poblacion = 'MALAGA';
update public.empresas set nombre = 'Deltat Procesos Térmicos SA'
  where id = '852b167c-4233-4a1c-8029-7cf5b8e622f8' and nombre = 'DELTAT PROCESOS TERMICOS SA';
update public.empresas set nombre = 'IF Desarrollos SL.', direccion = 'Avenida José Ortega y Gasset, 204', poblacion = 'Málaga'
  where id = 'b9aa6ea6-b3da-4d06-8609-b1defe16badb' and nombre = 'IF DESARROLLOS SL.' and direccion = 'AVENIDA JOSE ORTEGA Y GASSET, 204' and poblacion = 'MALAGA';
update public.empresas set nombre = 'EVM Group SL'
  where id = '15928e88-bf75-4580-954e-88536c3ff53d' and nombre = 'EVM GROUP SL';
update public.empresas set nombre = 'Servicios Docentes y Tutorías S.L.', direccion = 'Avenida de las Islas Canarias 105 Bloque 10 Piso 5º Derecha'
  where id = '18ab3acf-f00b-4284-82c3-9a733ac77e6a' and nombre = 'SERVICIOS DOCENTES Y TUTORIAS S.L.' and direccion = 'AVENIDA DE LAS ISLAS CANARIAS 105 BLOQUE 10 PISO 5º DERECHA';
update public.empresas set nombre = 'Formacionline Sociedad Limitada.', direccion = 'C/San Francisco 18', poblacion = 'Valverde', provincia = 'Santa Cruz de Tenerife'
  where id = '9270889d-7cab-4e25-ac6c-a0fbc12adb95' and nombre = 'FORMACIONLINE SOCIEDAD LIMITADA.' and direccion = 'C/SAN FRANCISCO 18' and poblacion = 'VALVERDE' and provincia = 'SANTA CRUZ DE TENERIFE';
update public.empresas set nombre = 'Asoc para la Formación Ocupacional y Promoción Educativa Aprende', direccion = 'Calle Tigaday 5'
  where id = '32b9e3d0-e08d-400f-8964-79f5512b30fa' and nombre = 'ASOC PARA LA FORMACION OCUPACIONAL Y PROMOCION EDUCATIVA APRENDE' and direccion = 'CALLE TIGADAY 5';
update public.empresas set nombre = 'Fundación Generation Spain'
  where id = '8d2368c3-4583-42ff-9e9a-c66836dec368' and nombre = 'FUNDACIÓN GENERATION SPAIN';
update public.empresas set nombre = 'Fundación Balia por la Infancia', direccion = 'Calle Fereluz, 44', poblacion = 'Madrid'
  where id = 'aa47ea6d-5597-4b49-845d-b8f0e58ce185' and nombre = 'FUNDACION BALIA POR LA INFANCIA' and direccion = 'CALLE FERELUZ, 44' and poblacion = 'MADRID';
update public.empresas set nombre = 'Femxa Formación SLU', direccion = 'Calle San Roque, 57 - 61 BJ', poblacion = 'Vigo'
  where id = 'e5f604cb-3666-4931-8ec7-98bbadf7022d' and nombre = 'FEMXA FORMACION SLU' and direccion = 'CALLE SAN ROQUE, 57 - 61 BJ' and poblacion = 'VIGO';
update public.empresas set nombre = 'Fundación del Real Madrid', direccion = 'Avenida Concha Espina, 1', poblacion = 'Madrid'
  where id = 'cf82b652-d37a-4c5b-b79d-6c1a0076b95b' and nombre = 'FUNDACION DEL REAL MADRID' and direccion = 'AVENIDA CONCHA ESPINA, 1' and poblacion = 'MADRID';
update public.empresas set nombre = 'Fundación Universidad-Empresa'
  where id = 'f4390a0e-7ca5-4e93-b77f-118a0f6f62dc' and nombre = 'FUNDACIÓN UNIVERSIDAD-EMPRESA';
update public.empresas set nombre = 'Fundación CNSE para la Supresión de las Barreras de Comunicación', direccion = 'Calle Islas Aleutianas, 28', poblacion = 'Madrid'
  where id = '0b58713b-4b7b-4ffa-9a65-98c5dc1aeb89' and nombre = 'FUNDACION CNSE PARA LA SUPRESION DE LAS BARRERAS DE COMUNICACION' and direccion = 'CALLE ISLAS ALEUTIANAS, 28' and poblacion = 'MADRID';
update public.empresas set nombre = 'Gesvalt Sociedad de Tasación SA.'
  where id = '288cd5ef-48b9-4b21-9969-c82bf882642c' and nombre = 'GESVALT SOCIEDAD DE TASACION SA.';
update public.empresas set nombre = 'Hospital de Fuenlabrada', direccion = 'Camino del Molino, 2', poblacion = 'Fuenlabrada'
  where id = '8c760c34-5d4f-4a36-93d2-cf9e3dba433c' and nombre = 'HOSPITAL DE FUENLABRADA' and direccion = 'CAMINO DEL MOLINO, 2' and poblacion = 'FUENLABRADA';
update public.empresas set nombre = 'Hospital Universitario del Tajo', direccion = 'Avenida Amazonas Central, S/N', poblacion = 'Aranjuez'
  where id = '12ae15dd-9c70-430f-87ed-a4fce1566235' and nombre = 'HOSPITAL UNIVERSITARIO DEL TAJO' and direccion = 'AVENIDA AMAZONAS CENTRAL, S/N' and poblacion = 'ARANJUEZ';
update public.empresas set nombre = 'Hospital Universitario Fundación Alcorcón', direccion = 'Calle Budapest, 1', poblacion = 'Alcorcón'
  where id = 'e8220f3b-d746-4a94-a4c5-bf58cd91c272' and nombre = 'HOSPITAL UNIVERSITARIO FUNDACION ALCORCON' and direccion = 'CALLE BUDAPEST, 1' and poblacion = 'ALCORCON';
update public.empresas set nombre = 'Hospital Universitario Infanta Cristina', direccion = 'Av 9 de Junio, Nº 2'
  where id = '812d9442-8930-4bbc-b0f5-0b9d075de395' and nombre = 'HOSPITAL UNIVERSITARIO INFANTA CRISTINA' and direccion = 'AV 9 DE JUNIO, Nº 2';
update public.empresas set nombre = 'Hospital Universitario José Germain', direccion = 'Calle Luna, 1', poblacion = 'Leganés'
  where id = '0715d084-6f74-4a02-bde0-0038e0dd030f' and nombre = 'HOSPITAL UNIVERSITARIO JOSE GERMAIN' and direccion = 'CALLE LUNA, 1' and poblacion = 'LEGANES';

-- ── clientes (9 filas) ──
update public.clientes set empresa = 'Fundación de la Comunitat Valenciana para la Gestión del Instituto de Investigación Sanitaria y Bio'
  where id = 'c5b0085e-16c5-4eb1-845d-efab34fcda08' and empresa = 'FUNDACION DE LA COMUNITAT VALENCIANA PARA LA GESTION DEL INSTITUTO DE INVESTIGACION SANITARIA Y BIO';
update public.clientes set empresa = 'Fundación General de la Universidad Politécnica de Madrid'
  where id = 'eefa8b1a-f168-4125-923d-f6e7f186846a' and empresa = 'FUNDACION GENERAL DE LA UNIVERSIDAD POLITECNICA DE MADRID';
update public.clientes set empresa = 'Ayuntamiento de Guía de Isora'
  where id = 'f5e4fa64-d03f-4cef-ba99-bed804923773' and empresa = 'AYUNTAMIENTO DE GUIA DE ISORA';
update public.clientes set empresa = 'Diseñarte Informática y Comunicaciones SLL.'
  where id = 'f31e1a6b-6968-40b1-b04a-52f3325ad59a' and empresa = 'DISEÑARTE INFORMATICA Y COMUNICACIONES SLL.';
update public.clientes set empresa = 'Cecbaf Khalil Gibran SL'
  where id = 'b4372c51-7eed-43b2-9121-b1f6e7be727e' and empresa = 'CECBAF KHALIL GIBRAN SL';
update public.clientes set empresa = 'R Mayline Royal Mayline, S.L.'
  where id = '78458e48-c080-4e61-b86e-03fb268d2618' and empresa = 'R MAYLINE ROYAL MAYLINE, S.L.';
update public.clientes set empresa = 'Confederación Española de Centros de Enseñanza (CECE)'
  where id = '03a8ecd8-7fc9-4064-9f6e-6854177daab9' and empresa = 'CONFEDERACIÓN ESPAÑOLA DE CENTROS DE ENSEÑANZA (CECE)';
update public.clientes set empresa = 'Rafa', cif = '50720612T'
  where id = '455268f1-3361-4b85-845c-d26eaf32b4ff' and empresa = 'rafa' and cif = '50720612t';
update public.clientes set empresa = 'Autoescuela Loeches SL'
  where id = 'c6db793a-b00a-42db-81b3-e948bc66b181' and empresa = 'AUTOESCUELA LOECHES SL';

-- ── presupuestos (12 filas) ──
update public.presupuestos set empresa = 'Fundación General de la Universidad Politécnica de Madrid'
  where id = 'f414520f-b490-46b6-a5b7-35b3b69aa32c' and empresa = 'FUNDACION GENERAL DE LA UNIVERSIDAD POLITECNICA DE MADRID';
update public.presupuestos set empresa = 'Fundación General de la Universidad Politécnica de Madrid'
  where id = '8ce6870f-a885-48dc-a39c-cec904a0a148' and empresa = 'FUNDACION GENERAL DE LA UNIVERSIDAD POLITECNICA DE MADRID';
update public.presupuestos set empresa = 'R Mayline Royal Mayline, S.L.'
  where id = '24f3a900-59e8-4172-80e1-6efc6bb8c26f' and empresa = 'R MAYLINE ROYAL MAYLINE, S.L.';
update public.presupuestos set empresa = 'Cecbaf Khalil Gibran SL'
  where id = '7c9590ad-b1dc-4793-ac7f-df71ff731115' and empresa = 'CECBAF KHALIL GIBRAN SL';
update public.presupuestos set empresa = 'Grupo Esla'
  where id = '887cb38f-d935-4bc4-a0be-afd2fc7f75ce' and empresa = 'GRUPO ESLA';
update public.presupuestos set empresa = 'Fundación General de la Universidad Politécnica de Madrid'
  where id = '13b67d15-6ac5-40eb-b967-f5bfd077afad' and empresa = 'FUNDACION GENERAL DE LA UNIVERSIDAD POLITECNICA DE MADRID';
update public.presupuestos set empresa = 'Fundación General de la Universidad Politécnica de Madrid'
  where id = '66d8e1f4-bf30-4bd2-a0cf-6d4fe0d34f7f' and empresa = 'FUNDACION GENERAL DE LA UNIVERSIDAD POLITECNICA DE MADRID';
update public.presupuestos set empresa = 'Fundación de la Comunitat Valenciana para la Gestión del Instituto de Investigación Sanitaria y Bio'
  where id = '874df1c2-b9e1-490c-9101-23b5d70ef406' and empresa = 'FUNDACION DE LA COMUNITAT VALENCIANA PARA LA GESTION DEL INSTITUTO DE INVESTIGACION SANITARIA Y BIO';
update public.presupuestos set empresa = 'Nombre de la Empresa'
  where id = '00935e6f-07e6-46d9-9cca-0de17a5af19b' and empresa = 'NOMBRE DE LA EMPRESA';
update public.presupuestos set empresa = 'Diseñarte Informática y Comunicaciones SLL.'
  where id = '05d0f8ee-88d3-4148-acc6-77b4672a6128' and empresa = 'DISEÑARTE INFORMATICA Y COMUNICACIONES SLL.';
update public.presupuestos set empresa = 'Ayuntamiento de Guía de Isora'
  where id = '5f77da01-21b8-4d2c-ad41-b481bca1a9b7' and empresa = 'AYUNTAMIENTO DE GUIA DE ISORA';
update public.presupuestos set empresa = 'Rafa', nombre = 'Rafa Galobi', contacto_nombre = 'Rafa', contacto_apellidos = 'Galobi', cargo = 'Jefe', cif = '50720612T'
  where id = 'fdeacb1a-1137-46fe-8484-02a28f06c85f' and empresa = 'rafa' and nombre = 'rafa galobi' and contacto_nombre = 'rafa' and contacto_apellidos = 'galobi' and cargo = 'jefe' and cif = '50720612t';

-- ── perfiles (2 filas) ──
update public.perfiles set nombre = 'Rafael'
  where id = '85f0e75b-1f28-4089-866b-ff88b323983d' and nombre = 'rafael';
update public.perfiles set nombre = 'Rafael'
  where id = '0ce072dd-308b-4315-9bb6-23dffd3bd796' and nombre = 'rafael';
