import { StatusBar } from 'expo-status-bar';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <View>
        <Text>OficinaSync</Text>
        <Text>Controle para oficinas</Text>
      </View>
      <View>
        <Text>Olá, mecanico!</Text>
        <Text>Entre na sua conta para acessar suas ordens de serviço</Text>
      </View>
      <View>

        <View>
          <Text>E-mail</Text>
          <TextInput
            placeholder='seu@email.com.br'
          />
          <Text>Senha</Text>
          <TextInput
            placeholder='***********'
          />
          <Text>Esqueceu a senha?</Text>
          
          <Button
            title='Entrar no sistema'
          />
        </View>
      
      </View>
      
      
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
